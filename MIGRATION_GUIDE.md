# Migration from FastAPI Backend to Supabase Edge Functions

## Overview
This guide documents the complete migration of email service functionality from the FastAPI backend to Supabase Edge Functions. This eliminates the need to maintain a separate backend server.

## What's Changed

### Before (FastAPI Backend)
```
Frontend → Backend API (/api/email/*) → Elastic Email
```

### After (Supabase Edge Functions)
```
Frontend (creates shipment/user) → Supabase Database Trigger → Email Queue → Edge Function → Resend
```

**Note**: Now uses **Resend** instead of Elastic Email for better free tier support and modern API.

## Architecture

### Database Layer (Supabase)

#### New `email_queue` Table
Stores pending emails to be processed:
```sql
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_type TEXT (welcome|shipment_created|shipment_update),
    recipient_email TEXT,
    recipient_name TEXT,
    user_id UUID (REFERENCES profiles),
    shipment_id UUID (REFERENCES shipments),
    template_data JSONB,
    status TEXT (pending|sent|failed|retrying),
    error_message TEXT,
    retry_count INT,
    created_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### Database Triggers
Three automatic triggers queue emails when events occur:

1. **Welcome Email Trigger** - Fires when new user profile created
   - Triggered by: `INSERT on profiles`
   - Email type: `welcome`
   - Contains: user name, email, role

2. **Shipment Created Trigger** - Fires when new shipment created
   - Triggered by: `INSERT on shipments`
   - Email type: `shipment_created`
   - Contains: tracking number, sender name, status

3. **Shipment Update Trigger** - Fires when shipment status changes
   - Triggered by: `UPDATE on shipments` (when `current_status` changes)
   - Email type: `shipment_update`
   - Contains: tracking number, new status, sender/recipient names

### Edge Function Layer

#### Function: `send-queued-emails`
Location: `supabase/functions/send-queued-emails/index.ts`

**Functionality:**
- Runs every 5 minutes (via cron: `*/5 * * * *`)
- Queries `email_queue` table for pending emails
- Processes up to 10 emails per invocation
- Generates HTML email content from templates
- Sends via Resend API
- Updates queue status (sent/failed/retrying)
- Implements retry logic (max 3 attempts per email)

**Configuration:**
```json
{
  "scheduler": {
    "enabled": true,
    "cron": "*/5 * * * *",
    "timeout_sec": 30
  },
  "allowList": ["https://api.elasticemail.com"]
}
```

## Setup Instructions

### Step 1: Update Supabase SQL Schema

1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase_setup.sql`
3. Execute in SQL Editor
4. This creates:
   - `email_queue` table
   - Indexes for performance
   - RLS policies
   - Database triggers

**Verify schema was created:**
```sql
-- Check table exists
SELECT * FROM email_queue LIMIT 1;

-- Check triggers exist
SELECT * FROM information_schema.triggers 
WHERE trigger_schema = 'public' AND trigger_name LIKE 'trigger_%email%';
```

### Step 2: Deploy Edge Function

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install CLI if not already done
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-queued-emails
```

#### Option B: Using Supabase Dashboard

1. Go to Supabase Dashboard → Edge Functions
2. Click "Create a new function"
3. Name: `send-queued-emails`
4. Copy entire contents from `supabase/functions/send-queued-emails/index.ts`
5. Click Deploy
6. Go to function settings and add Env Vars (see Step 3)

### Step 3: Configure Environment Variables

Set these secrets in Supabase Dashboard → Settings → Secrets:

```
ELASTIC_EMAIL_API_KEY=your_elastic_email_api_key
ELASTIC_EMAIL_FROM_EMAIL=noreply@globalaccess.com
ELASTIC_EMAIL_FROM_NAME=Global Access Shipping
FRONTEND_URL=https://yourdomain.com
```

### Step 4: Update Frontend

The frontend has been updated to remove email API calls. Changes made:

**RegisterPage.jsx**
- Removed: `import { sendWelcomeEmail } from "../lib/emailService"`
- Removed: Direct email API call after registration
- Updated toast message: "A welcome email will be sent shortly"
- Email now sent automatically via trigger when profile created

**CreateEditShipmentPage.jsx**
- Removed: `import { sendShipmentCreatedEmail } from "../lib/emailService"`
- Removed: Direct email API call after shipment creation
- Updated toast message: "Recipient will be notified via email"
- Email now sent automatically via trigger when shipment created

**ShipmentDetailPage.jsx**
- Removed: `import { sendShipmentUpdateEmail }` (if present)
- Not calling email API on status updates
- Email sent automatically via trigger when status changes

### Step 5: Remove Backend Code

Delete the entire `backend/` directory and related files:

```bash
rm -rf backend/
rm requirements.txt  # if in root
rm backend_test.py   # if in root
```

The email functionality is completely replaced by Supabase Edge Functions.

## How It Works: Complete Flow

### Welcome Email Flow
```
1. User registers on frontend
2. Frontend calls supabase.auth.signUp()
3. Supabase Auth creates user in auth.users
4. Database trigger: handle_new_user() fires
5. Profile inserted into profiles table
6. Database trigger: queue_welcome_email() fires
7. Email queued in email_queue table with status='pending'
8. (5 min later) Edge function wakes up via cron
9. Queries email_queue for pending emails
10. Generates welcome email HTML
11. Sends via Resend API
12. Updates email_queue.status = 'sent' and sent_at
13. User receives email in inbox
```

### Shipment Created Email Flow
```
1. Admin/customer creates shipment on dashboard
2. Frontend calls createShipment(data)
3. Data inserted into shipments table
4. Database trigger: queue_shipment_created_email() fires
5. Email queued with: recipient_email, tracking_number, sender_name
6. Edge function picks up when next scheduled (max 5 min wait)
7. Generates shipment created email
8. Sends via Resend API
9. Updates email_queue status
10. Recipient gets notified
```

### Shipment Status Update Email Flow
```
1. Driver/admin updates shipment status on dashboard
2. Frontend calls updateShipment() with new status
3. Shipment record updated in database
4. Trigger: queue_shipment_update_email() fires (IF status changed)
5. Email queued with: new status, tracking number, location
6. Edge function processes email
7. Sends status update email
8. Recipient notified of progress
```

## Monitoring & Debugging

### Check Email Queue Status

```sql
-- View all pending emails
SELECT id, email_type, recipient_email, status, created_at 
FROM email_queue 
WHERE status = 'pending'
ORDER BY created_at;

-- View failed emails
SELECT id, email_type, recipient_email, error_message, retry_count
FROM email_queue
WHERE status IN ('failed', 'retrying')
ORDER BY updated_at DESC;

-- View sent emails (last 24 hours)
SELECT id, email_type, recipient_email, sent_at
FROM email_queue
WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;

-- Total sent this week
SELECT COUNT(*) as emails_sent_this_week
FROM email_queue
WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '7 days';
```

### Check Edge Function Logs

Supabase Dashboard → Edge Functions → `send-queued-emails` → Logs

Look for:
- Function invocation timestamp
- Number of emails processed
- Success/failure counts
- Any error messages

### Manual Edge Function Invocation

For testing without waiting 5 minutes:

```bash
# Using curl
curl -X POST https://YOUR_PROJECT.functions.supabase.co/send-queued-emails \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Or using JavaScript
const response = await fetch(
  `${supabaseUrl}/functions/v1/send-queued-emails`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }
);
const data = await response.json();
console.log(data);
```

### Retry Logic

Emails with `status = 'retrying'` will be picked up again on next cron run.

Manual retry:

```sql
-- Reset failed emails to pending (max 3 attempts)
UPDATE email_queue
SET status = 'pending', retry_count = 0
WHERE status IN ('failed', 'retrying') 
AND retry_count < 3
AND created_at > NOW() - INTERVAL '24 hours';
```

## Email Templates

Templates are embedded in the Edge Function (`send-queued-emails/index.ts`):

### 1. Welcome Email
- **Triggered by:** New user registration
- **Data:** name, email, role
- **Subject:** "Welcome to Global Access Shipping!"
- **Contains:** Personalized welcome message, role-specific instructions

### 2. Shipment Created Email
- **Triggered by:** New shipment created
- **Data:** tracking_number, sender_name, recipient_name
- **Subject:** "New Shipment Created - {TRACKING_NUMBER}"
- **Contains:** Tracking number, sender info, shipment pending status

### 3. Shipment Update Email
- **Triggered by:** Status change on existing shipment
- **Data:** tracking_number, status, recipient_name, sender_name
- **Subject:** "Shipment Update: {STATUS} - {TRACKING_NUMBER}"
- **Contains:** New status with color-coded badge, location info, status message

All templates use Global Access branding colors and responsive HTML design.

## Troubleshooting

### Emails Not Sending

**Check 1: Queue is empty**
```sql
SELECT COUNT(*) FROM email_queue WHERE status = 'pending';
```
- If 0: Triggers aren't firing. Check trigger functions exist in database.

**Check 2: API Key configured**
- Go to Supabase Settings → Secrets
- Verify `RESEND_API_KEY` is set and correct

**Check 3: Edge function logs**
- Check Supabase Dashboard → Edge Functions → send-queued-emails → Logs
- Look for error messages or API failures

**Check 4: Resend free tier limits**
- Free tier: 100 emails per day (no recipient restrictions!)
- Paid tier: $20/month for 50,000 emails
- No need for expensive upgrades like Elastic Email

### Emails in Retry State

```sql
-- View emails stuck in retry
SELECT * FROM email_queue
WHERE status = 'retrying'
AND updated_at < NOW() - INTERVAL '1 hour';

-- Force reprocess
UPDATE email_queue
SET status = 'pending'
WHERE id = 'email_id_here';
```

### High Retry Count

If `retry_count >= 3`:
```sql
-- Mark as permanently failed
UPDATE email_queue
SET status = 'failed',
    error_message = 'Max retries exceeded'
WHERE retry_count >= 3
AND status = 'retrying';
```

## Performance Considerations

- **Queue processing:** Every 5 minutes (configurable via cron)
- **Batch size:** 10 emails per invocation
- **Timeout:** 30 seconds per invocation
- **Concurrent:** Supabase handles multiple functions automatically

For high volume:
- Increase batch size: `limit(50)` in query
- Decrease interval: Change cron to `*/2 * * * *` (every 2 minutes)
- Monitor function duration in logs

## Rollback Plan

If you need to revert to FastAPI backend:

1. Disable edge function cron:
   ```bash
   supabase functions update send-queued-emails --no-verify-jwt
   ```

2. Set trigger functions to NOT insert into email_queue:
   ```sql
   DROP TRIGGER trigger_welcome_email ON profiles;
   DROP TRIGGER trigger_shipment_created_email ON shipments;
   DROP TRIGGER trigger_shipment_update_email ON shipments;
   ```

3. Reinstall backend and restore email API routes

4. Restore frontend email service calls

## Cost Analysis

### Before (FastAPI Backend)
- Always-on server cost: $5-20/month (depending on provider)
- Limited scalability without manual intervention
- Requires DevOps maintenance

### After (Supabase Edge Functions)
- Per-invocation pricing: ~$0.0000002 per invocation
- 5 emails/day × 30 days × 365 invocations = ~$0.03/year
- Scales automatically
- No server maintenance

**Estimated savings: 99%+ reduction in backend infrastructure costs**

## Files Modified

### Database
- `/supabase_setup.sql` - Added email_queue table, triggers, RLS

### Edge Functions (New)
- `/supabase/functions/send-queued-emails/index.ts` - Main function
- `/supabase/functions/send-queued-emails/config.json` - Cron configuration

### Frontend (Simplified)
- `/frontend/src/pages/RegisterPage.jsx` - Removed email service import and call
- `/frontend/src/pages/CreateEditShipmentPage.jsx` - Removed email service import and call
- `/frontend/src/pages/ShipmentDetailPage.jsx` - Removed email service import

### Frontend (Can be deleted)
- `/frontend/src/lib/emailService.js` - No longer needed (optional deletion)

### Backend (Can be deleted entirely)
- `/backend/` - Entire directory
- `/backend/requirements.txt`
- `/backend/server.py`
- `/backend/tests/`
- `/backend_test.py`

## Next Steps

1. **Run SQL migration:** Execute updated `supabase_setup.sql` in Supabase SQL Editor
2. **Deploy edge function:** Use Supabase CLI or Dashboard
3. **Set environment secrets:** Add RESEND_API_KEY and other Resend env vars (see RESEND_SETUP.md)
4. **Test welcome email:** Register a new test account (can use any email now!)
5. **Test shipment email:** Create a test shipment and verify recipient gets notification
6. **Test status update:** Update shipment status and verify status email sent
7. **Monitor queue:** Check email_queue table for sent status
8. **Optional: Verify domain** in Resend for better deliverability
9. **Celebrate:** Modern, affordable email service! 🎉

## Support & Questions

Refer to:
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Resend API Docs: https://resend.com/docs/api-reference/emails/send
- Resend Setup: RESEND_SETUP.md (in root - new!)
- Migration Guide: MIGRATION_GUIDE.md (in root)
