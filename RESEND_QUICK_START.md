# Resend Migration - Quick Start

## In 5 Minutes

### 1. Create Resend Account
```
Go to https://resend.com → Sign up → Verify email
```

### 2. Get API Key
```
Resend Dashboard → Settings → API Keys → Create → Copy
```

### 3. Add to Supabase Secrets
```
Supabase Dashboard → Settings → Secrets

Add:
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@globalaccess.com
RESEND_FROM_NAME=Global Access Shipping
```

### 4. Deploy Function
```bash
supabase functions deploy send-queued-emails
```

Or in Supabase Dashboard:
```
Functions → send-queued-emails → Deploy latest
```

### 5. Test It
```
1. Register new user with ANY email (not just sasbaws22@gmail.com!)
2. Check email for welcome email
3. Should arrive in 1-2 seconds
```

## Troubleshooting

**Emails stuck in pending?**
- Check Supabase Secrets: Is RESEND_API_KEY set?
- Check Function Logs: Supabase → Functions → Logs
- Check email_queue table for error_message

**Need to see email delivery status?**
- Resend Dashboard → Emails

**Rollback to Elastic Email?**
- Need old edge function code back
- Restore ELASTIC_EMAIL_API_KEY secret
- Redeploy

## What Changed

| Item | Before | After |
|------|--------|-------|
| API | Elastic Email | Resend ✨ |
| File | `send-queued-emails/index.js` | ✅ Updated |
| Config | `config.json` allowlist | ✅ Updated |
| Database | email_queue table | No changes |
| Triggers | Database triggers | No changes |
| Templates | Email HTML | No changes |

## Cost Comparison

| Plan | Elastic Email | Resend |
|------|--------------|--------|
| Free | 150/mo (1 recipient only) ❌ | 100/day (any recipient) ✅ |
| Your Cost | ~$0-50/mo | ~$0/mo |

**You're now using a modern, affordable email service!** 🚀

---

For full details: See `RESEND_SETUP.md`
