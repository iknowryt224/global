# Render Deployment - Environment Setup Checklist

## 🔑 Supabase Credentials

Before deploying to Render, gather your Supabase credentials:

### Step 1: Get Supabase URLs/Keys

1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Select your **GlobalAccess** project
3. Go to **Settings** → **API**

You'll find:
- **Project URL** (looks like: `https://xxxxxxxx.supabase.co`)
- **Project API Keys** section with:
  - **Anon/Public Key** (starts with `eyJ...`)

### Step 2: Save These Values

```
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
```

---

## 📝 Render Environment Variables

When setting up Render deployment, add these environment variables:

### For Static Site Deployment:

| Variable Name | Value | Example |
|---------------|-------|---------|
| `REACT_APP_SUPABASE_URL` | Your Supabase Project URL | `https://xxxxxx.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | Your Supabase Anon Key | `eyJhbGc...` |

### For Web Service Deployment:

Add the same two variables above.

---

## 🔒 Supabase Configuration

These variables go in **Supabase Dashboard**, NOT in Render:

**Location:** Supabase Dashboard → Settings → Secrets/Vault

```
RESEND_API_KEY = re_xxxxx
RESEND_FROM_EMAIL = noreply@globalaccess.com
RESEND_FROM_NAME = Global Access Shipping
```

---

## ✅ Pre-Deployment Verification

- [ ] GitHub repository created and code pushed
- [ ] Supabase project is active and running
- [ ] Database tables created (ran supabase_setup.sql)
- [ ] Resend account created
- [ ] Supabase secrets configured
- [ ] Environment variables copied
- [ ] render.yaml file in root directory
- [ ] render-build.sh file in root directory

---

## 🚀 Quick Render Deployment

### Step 1: Create New Static Site
- Go to [render.com](https://render.com)
- Click **"New+"** → **"Static Site"**
- Connect your GitHub repository

### Step 2: Configure Build
- **Build Command:** `chmod +x render-build.sh && ./render-build.sh`
- **Publish Directory:** `frontend/build`

### Step 3: Add Environment
Add these in Render:
```
REACT_APP_SUPABASE_URL = (your supabase URL)
REACT_APP_SUPABASE_ANON_KEY = (your anon key)
```

### Step 4: Deploy
- Click **"Create Static Site"**
- Wait 2-3 minutes for build
- Your site is live! 🎉

---

## 📞 Troubleshooting

### Build Fails: "Module not found"
- Solution: Run locally first: `cd frontend && npm install && npm run build`
- Check all dependencies in package.json

### Blank Page After Deploy
- Check browser console (F12) for errors
- Verify environment variables are set
- Check that frontend/build folder exists

### API Calls Returning 403/CORS Errors
- Add your Render URL to Supabase allowed origins
- In Supabase: Auth → URL Configuration
- Add: `https://your-project.onrender.com`

### Slow Build Times
- Update node modules: `npm ci` instead of `npm install`
- Consider upgrading Render plan for faster builds

---

## 📊 After Deployment

1. **Test the deployment:**
   - Visit your Render URL
   - Try logging in
   - Create test shipment
   - Check for errors in console

2. **Monitor logs:**
   - Render Dashboard → Logs tab
   - Look for any 500 errors

3. **Set up custom domain:**
   - In Render → Settings → Custom Domain
   - Follow DNS setup instructions

---

**Status:** Ready to Deploy ✅
**Created:** March 26, 2026
