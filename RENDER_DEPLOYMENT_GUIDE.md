# Render Deployment Guide - Global Access Shipping

## 📋 Project Overview

**Architecture:**
- **Frontend:** React 19 with TypeScript/JavaScript (Tailwind CSS, React Router)
- **Backend:** Supabase Edge Functions (Serverless)
- **Database:** Supabase PostgreSQL
- **Email Service:** Resend via Supabase Edge Functions
- **Authentication:** Supabase Auth

**Deployment Structure:**
```
Render (Frontend) → Supabase (Backend/Database)
```

---

## 🎯 Deployment Options

### Option 1: Deploy Frontend as Static Site (Recommended for Production)
- **Cost:** Free tier available
- **Performance:** CDN-optimized
- **Best for:** Production-ready applications
- **Time to deploy:** ~5 minutes

### Option 2: Deploy Frontend as Web Service
- **Cost:** Pay-as-you-go (~$8-12/month minimum)
- **Performance:** Good with auto-scaling
- **Best for:** Development/Testing with auto-redeploys
- **Time to deploy:** ~3 minutes

*We'll cover both options below.*

---

## 📦 Pre-Deployment Checklist

### 1. **Create Environment Configuration**
Create `.env.production` in the frontend directory:

```bash
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Get these values from:**
- Supabase Dashboard → Project Settings → API

### 2. **Verify Build Configuration**
Check `frontend/` has:
- ✅ `package.json` (verified)
- ✅ `craco.config.js` (verified)
- ✅ `tailwind.config.js` (verified)
- ✅ `public/index.html` (verified)

### 3. **Test Build Locally**
```bash
cd frontend
npm install
npm run build
```

---

## 🚀 OPTION 1: Deploy as Static Site (FREE - Recommended)

### Step 1: Prepare Your Repository

1. **Create a GitHub repository** (if not already done):
   ```bash
   cd c:\Users\sasba\Downloads\globalaccess\globalaccess
   git init
   git add .
   git commit -m "Initial commit - ready for Render deployment"
   git remote add origin https://github.com/YOUR_USERNAME/global-access.git
   git branch -M main
   git push -u origin main
   ```

2. **Update `.gitignore`** - Make sure this exists with:
   ```
   node_modules/
   .env
   .env.local
   .env.production
   build/
   dist/
   .DS_Store
   ```

### Step 2: Create Build Script

Create a file `render-build.sh` in the **root** of your repository:

```bash
#!/bin/bash
set -e

echo "📦 Installing dependencies..."
cd frontend
npm ci

echo "🔨 Building production bundle..."
npm run build

echo "✅ Build complete! Output in frontend/build"
```

Make it executable:
```bash
chmod +x render-build.sh
```

### Step 3: Create Render Configuration

Create `render.yaml` in the root of your repository:

```yaml
services:
  - type: static_site
    name: global-access-shipping
    buildCommand: ./render-build.sh
    staticPublishPath: ./frontend/build
    routes:
      - path: /*
        destination: /index.html
    env:
      - key: REACT_APP_SUPABASE_URL
        value: ${SUPABASE_URL}
      - key: REACT_APP_SUPABASE_ANON_KEY
        value: ${SUPABASE_ANON_KEY}
```

### Step 4: Connect to Render

1. **Go to [render.com](https://render.com)**

2. **Sign up** (or log in)

3. **Create new project:**
   - Click **"New +"** → **"Static Site"**

4. **Connect GitHub:**
   - Select **"Connect your repo"**
   - Authorize Render to access GitHub
   - Find and select your `global-access` repository
   - Branch: `main`

5. **Configure Build:**
   - Build Command: `./render-build.sh`
   - Publish directory: `frontend/build`

6. **Add Environment Variables:**
   - Click **Environment** tab
   - Add both variables:
     - `REACT_APP_SUPABASE_URL` = `YOUR_SUPABASE_PROJECT_URL`
     - `REACT_APP_SUPABASE_ANON_KEY` = `YOUR_SUPABASE_ANON_KEY`

7. **Deploy:**
   - Click **"Create Static Site"**
   - Wait for build (2-3 minutes)
   - Your site will be live at `your-project.onrender.com`

### Step 5: Configure Custom Domain (Optional)

1. In Render Dashboard → Settings → Custom Domain
2. Enter your domain name
3. Add DNS records provided by Render
4. Wait for DNS propagation (5-30 minutes)

---

## 🚀 OPTION 2: Deploy as Web Service

### Step 1: GitHub Setup (Same as above)

Follow **Option 1, Steps 1** to push code to GitHub.

### Step 2: Create Backend Node Server

Create `server.js` in the root of your repository:

```javascript
const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(express.static(path.join(__dirname, 'frontend/build')));

// SPA fallback - routes not matching files serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 3: Update package.json

Create `package.json` in the root directory:

```json
{
  "name": "global-access-shipping",
  "version": "1.0.0",
  "description": "Global Access Shipping Application",
  "main": "server.js",
  "scripts": {
    "install-all": "npm install && cd frontend && npm install",
    "build": "cd frontend && npm run build",
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### Step 4: Connect to Render

1. Go to [render.com](https://render.com)

2. **Create new Web Service:**
   - Click **"New +"** → **"Web Service"**

3. **Connect GitHub repo** (same as Static Site)

4. **Configure Build:**
   - Name: `global-access-shipping`
   - Environment: `Node`
   - Build Command: `npm run install-all && npm run build`
   - Start Command: `npm start`
   - Instance Type: Free (`0.5 CPU`, 512 MB RAM)

5. **Add Environment Variables:**
   - `REACT_APP_SUPABASE_URL` = `YOUR_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY` = `YOUR_SUPABASE_ANON_KEY`

6. **Deploy:**
   - Click **"Create Web Service"**
   - Render will auto-deploy when you push to GitHub
   - Your site will be at `your-project.onrender.com`

---

## 🔑 Environment Variables

### For Supabase:

| Variable | Value | Where to find |
|----------|-------|---------------|
| `REACT_APP_SUPABASE_URL` | Your Supabase Project URL | Supabase Dashboard → Project Settings → API → Project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Your Anon Key | Supabase Dashboard → Project Settings → API → anon/public key |

### For Resend (Supabase Secrets, NOT Render):
These go in **Supabase**, not Render:
- `RESEND_API_KEY` = `re_your_key_here`
- `RESEND_FROM_EMAIL` = `noreply@globalaccess.com`
- `RESEND_FROM_NAME` = `Global Access Shipping`

---

## ✅ Post-Deployment Checklist

### 1. **Test Frontend**
- [ ] Navigate to your Render URL
- [ ] Test login/registration
- [ ] Verify API calls work
- [ ] Check console for errors (F12)

### 2. **Test Supabase Connection**
```javascript
// In browser console
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@latest/+esm');
const supabase = createClient('URL', 'KEY');
// Should not show auth errors
```

### 3. **Test Email Functionality**
- [ ] Create a test user
- [ ] Verify welcome email sent (check spam folder)
- [ ] Create test shipment
- [ ] Verify shipment notification sent

### 4. **Monitor Performance**
- [ ] Check Render Dashboard for errors
- [ ] Monitor response times
- [ ] Check database connections

---

## 🔧 Common Issues & Fixes

### Issue 1: Build Fails - "npm: not found"

**Solution:**
- Ensure `package.json` exists in root
- Check Node version (18.x recommended)
- Render build command should be: `npm run install-all && npm run build`

### Issue 2: Frontend Shows Blank Page

**Solution:**
1. Check browser console for errors (F12)
2. Verify environment variables are set
3. Ensure `frontend/build` folder was created
4. Check server is serving `index.html` for SPA routes

### Issue 3: API Calls Fail (CORS Error)

**Solution:**
- Check Supabase project is public (not restricted)
- Verify `REACT_APP_SUPABASE_ANON_KEY` is correct
- Add Render domain to Supabase allowed origins:
  - Supabase → Authentication → URL Configuration
  - Add: `https://your-project.onrender.com`

### Issue 4: Slow Build Times

**Solution:**
- Use `npm ci` instead of `npm install` (faster)
- Use caching in render.yaml
- Consider upgrading to paid tier for faster machines

---

## 📊 Monitoring & Debugging

### View Logs in Render:
1. Go to your service
2. Click **"Logs"** tab
3. Filter by date/time
4. Look for errors

### Enable Debug Mode:
Add to your `.env.production`:
```
REACT_APP_DEBUG=true
```

### Monitor Supabase:
- Supabase Dashboard → Database → Monitor
- Real-time stats on queries, connections, storage

---

## 🚀 Continuous Deployment Setup

### Auto-Deploy on Git Push:
1. In Render Dashboard → Settings
2. **Auto-deploy:** Enable for branch `main`
3. Now every push to main will trigger a rebuild

### Environment-Specific Deployments:
1. Create new branch `staging`
2. In Render, create new service connected to `staging` branch
3. Test on staging before merging to main

---

## 💡 Performance Optimization Tips

### 1. **Enable Caching** (add to render.yaml):
```yaml
staticPublishPath: ./frontend/build
headers:
  - path: "/"
    values:
      Cache-Control: "public, max-age=0, must-revalidate"
  - path: "/static/*"
    values:
      Cache-Control: "public, max-age=31536000, immutable"
```

### 2. **Optimize Image Loading:**
- Use WebP format
- Lazy load images
- Use CDN for static assets

### 3. **Code Splitting:**
Already handled by React/Webpack.

### 4. **Database Indexing:**
Check `supabase_setup.sql` - indexes already configured.

---

## 📱 Mobile Testing

1. Get your Render URL
2. Share link from your phone
3. Test responsiveness
4. Test touch interactions
5. Test on slow 4G

---

## 🎯 Next Steps After Deployment

1. **Set up monitoring:**
   - Error tracking (Sentry)
   - Analytics (Posthog)
   - Uptime monitoring (Uptime Robot)

2. **Set up CI/CD:**
   - GitHub Actions for tests before deploy
   - Automatic deployments on pull request approvals

3. **Plan for scale:**
   - Upgrade Supabase plan if needed
   - Consider caching layer (Redis/Memcached)
   - Monitor database queries

4. **Security checklist:**
   - [ ] Enable HTTPS (automatic with Render)
   - [ ] Set up RLS policies in Supabase
   - [ ] Regular security audits
   - [ ] Keep dependencies updated

---

## 📞 Support & Resources

- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.io/docs
- **React Deployment:** https://react.dev/learn/deployment
- **Troubleshooting:** Check logs and browser console first

---

## Summary Table

| Aspect | Static Site | Web Service |
|--------|------------|------------|
| **Cost** | Free | Free ($8-12/mo paid) |
| **Setup Time** | 5 mins | 3 mins |
| **Auto-deploys** | Yes | Yes |
| **Performance** | Excellent (CDN) | Good |
| **Best For** | Production | Dev/Testing |
| **Scaling** | Unlimited | Auto-scales |
| **Custom Domain** | Yes | Yes |

**Recommendation:** Use **Static Site** for production. It's faster, cheaper, and perfect for React SPAs.

---

**Last Updated:** March 26, 2026
**Created for:** Global Access Shipping
**Status:** Ready to Deploy ✅
