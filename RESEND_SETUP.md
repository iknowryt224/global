# Resend Email Migration Guide

This document explains how to set up Resend as your email provider for Global Access Shipping, replacing Elastic Email.

## ✅ What Has Changed

Your edge function has been fully migrated from Elastic Email to Resend:
- Updated API endpoint from `elasticemail.com` to `resend.com`
- Simplified API payload format
- Better error handling and response parsing
- Same email templates and queuing system preserved

## 🚀 Setup Steps

### Step 1: Create Resend Account
1. Go to https://resend.com
2. Sign up with your email
3. Verify your email address

### Step 2: Get API Key
1. Log in to Resend Dashboard
2. Go to **Settings → API Keys**
3. Click **Create API Key**
4. Copy the API key (starts with `re_`)
5. Store it securely

### Step 3: Configure Supabase Secrets
1. Go to your **Supabase Project Dashboard**
2. Navigate to **Settings → Secrets**
3. Add the following secrets:

```
RESEND_API_KEY = re_your_actual_api_key_here
RESEND_FROM_EMAIL = noreply@globalaccess.com
RESEND_FROM_NAME = Global Access Shipping
```

Optional secrets (already have defaults):
```
RESEND_FROM_EMAIL = noreply@globalaccess.com  (default)
RESEND_FROM_NAME = Global Access Shipping      (default)
```

### Step 4: Deploy Updated Function
The edge function `send-queued-emails` has been automatically updated. To redeploy:

```bash
# From project root
supabase functions deploy send-queued-emails
```

Or via Supabase Dashboard:
1. Go to **Functions → send-queued-emails**
2. Click **Deploy latest version**

### Step 5: Verify Domain (Recommended)
To improve deliverability and remove "via resend.com" footer:

1. In Resend Dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `globalaccess.com`)
4. Add the DNS records shown (DKIM, DMARC, SPF)
5. Once verified, update the secret:

```
RESEND_FROM_EMAIL = noreply@globalaccess.com  (with your verified domain)
```

## 📊 Pricing Comparison

| Feature | Elastic Email (Old) | Resend (New) |
|---------|-------------------|------------|
| Free Tier | 150/month (1 recipient only) | 100/day forever |
| Paid Plan | $15-50/month | $20/month for 50k/month |
| Per Email Cost | Variable | $0.20 per email over free tier |
| **Your Cost** | ~$0-50/month | ~$0/month (within free tier) |

## ✅ Testing

### Test 1: Create Test User
1. Go to your app's registration page
2. Create a new user (use any email - not just sasbaws22@gmail.com anymore!)
3. Check email inbox for welcome email
4. **Expected**: Email arrives within 1-2 seconds

### Test 2: Create Shipment
1. Log in as admin/customer
2. Create a new shipment
3. Monitor Resend Dashboard for delivery status
4. **Expected**: Notification email arrives

### Test 3: Update Shipment Status
1. In admin panel, update shipment status
2. Check Resend Dashboard
3. **Expected**: Status update email arrives to recipient

### Monitor Email Queue
Check database for sent emails:
```sql
SELECT id, recipient_email, email_type, status, sent_at 
FROM email_queue 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔍 Debugging

### Issue: Emails Not Sending
1. **Check Resend Secret**: Verify `RESEND_API_KEY` is set in Supabase
2. **Check Function Logs**: Go to Supabase Dashboard → Functions → Logs
3. **Check Email Queue**: Query `email_queue` table for error_message
4. **Check Resend Dashboard**: See actual bounce/error reasons

### Issue: Emails Going to Spam
1. Verify domain in Resend (removes "via resend.com" footer)
2. Add SPF/DKIM/DMARC records
3. Warm up sending (start with lower volume)

### Issue: Rate Limiting
Resend free tier allows:
- unlimited emails per day
- No rate limits unless sending millions

### Console Logs
Your edge function logs to:
- **Supabase Dashboard**: Functions → send-queued-emails → Logs
- **Errors prefixed with**: `[Resend Error]` or `[Resend API]`

## 📚 Useful Links

- **Resend Docs**: https://resend.com/docs
- **API Reference**: https://resend.com/docs/api-reference/emails/send
- **Dashboard**: https://dashboard.resend.com
- **Status Page**: https://status.resend.com

## 🔄 Rollback to Elastic Email (if needed)

If you need to rollback:
1. Revert `supabase/functions/send-queued-emails/index.js`
2. Re-add `ELASTIC_EMAIL_API_KEY` to Supabase secrets
3. Redeploy function

## 📝 What NOT Changed

- ✅ Email templates remain identical
- ✅ Email queue database table unchanged
- ✅ Cron schedule (every 5 minutes) unchanged
- ✅ Trigger functions unchanged
- ✅ Retry logic (3 attempts) unchanged
- ✅ Frontend code unchanged

## 🎯 Next Steps

1. ✅ Create Resend account and get API key
2. ✅ Add secrets to Supabase
3. ✅ Deploy the updated function
4. ✅ Test with registration and shipment creation
5. ✅ Monitor first week of emails
6. ✅ (Optional) Verify your domain for better deliverability

## ❓ Support

For issues:
1. Check Resend Dashboard for delivery status
2. Review function logs in Supabase
3. Verify secrets are set correctly
4. Check email_queue table for errors
