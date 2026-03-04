# Deployment Guide - Vercel + Render

## 🚀 Quick Deployment Steps

### Part 1: Deploy Backend to Render (15 minutes)

#### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

#### Step 2: Deploy Backend
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `sandeep0926/project-Full--Stack`
3. Configure:
   - **Name**: `enterprise-backend` (or your choice)
   - **Region**: Oregon (Free)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

#### Step 3: Add Environment Variables
Click "Environment" and add these variables:

```
NODE_ENV=production
PORT=3000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<generate-random-secret>
JWT_REFRESH_SECRET=<generate-random-refresh-secret>
CLIENT_URL=https://your-app.vercel.app
STRIPE_SECRET_KEY=<your-stripe-secret-key>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/api/v1/auth/google/callback
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your-email@gmail.com>
EMAIL_PASS=<your-gmail-app-password>
EMAIL_FROM=Enterprise Platform <your-email@gmail.com>
```

**Important**: Replace `your-app.vercel.app` with your actual Vercel URL (you'll get this in Part 2)

#### Step 4: Add Redis (Optional but Recommended)
1. In Render dashboard, click "New +" → "Redis"
2. Name: `enterprise-redis`
3. Plan: Free
4. Click "Create Redis"
5. Copy the "Internal Redis URL"
6. Go back to your web service → Environment
7. Add:
   ```
   REDIS_URL=<paste-internal-redis-url>
   ```

#### Step 5: Deploy
1. Click "Create Web Service"
2. Wait 5-10 minutes for deployment
3. Your backend URL will be: `https://enterprise-backend.onrender.com`
4. Test it: `https://enterprise-backend.onrender.com/health`

---

### Part 2: Deploy Frontend to Vercel (5 minutes)

#### Step 1: Update Frontend Environment
1. Open `client/.env.production`
2. Replace `your-backend-app.onrender.com` with your actual Render URL
3. Save the file

#### Step 2: Commit Changes
```bash
git add client/.env.production client/vercel.json
git commit -m "feat: Add Vercel deployment config"
git push origin main
```

#### Step 3: Deploy to Vercel
1. Go to https://vercel.com
2. Sign up/Login with GitHub
3. Click "Add New" → "Project"
4. Import `sandeep0926/project-Full--Stack`
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### Step 4: Add Environment Variables
In Vercel project settings → Environment Variables:

```
VITE_API_URL=https://enterprise-backend.onrender.com/api/v1
VITE_STRIPE_PUBLIC_KEY=<your-stripe-publishable-key>
```

**Important**: Replace `enterprise-backend.onrender.com` with your actual Render backend URL

#### Step 5: Deploy
1. Click "Deploy"
2. Wait 2-3 minutes
3. Your frontend URL will be: `https://your-app.vercel.app`

---

### Part 3: Update CORS Settings

#### Step 1: Update Backend CORS
Go back to Render → Your backend service → Environment

Update `CLIENT_URL`:
```
CLIENT_URL=https://your-actual-app.vercel.app
```

#### Step 2: Redeploy Backend
Click "Manual Deploy" → "Deploy latest commit"

---

### Part 4: Seed Analytics Data

#### Option 1: Using Render Shell
1. Go to Render dashboard → Your backend service
2. Click "Shell" tab
3. Run:
```bash
node scripts/seed-analytics.js
node scripts/update-tenant-features.js
```

#### Option 2: Using API (Easier)
1. Open your deployed frontend: `https://your-app.vercel.app`
2. Login with: admin@enterprise.com / Admin@123456
3. Navigate around the app - analytics will be tracked automatically

---

## ✅ Verification Checklist

### Backend (Render)
- [ ] Health check works: `https://your-backend.onrender.com/health`
- [ ] API docs accessible: `https://your-backend.onrender.com/api-docs`
- [ ] No errors in Render logs
- [ ] MongoDB connected (check logs)
- [ ] Redis connected (check logs)

### Frontend (Vercel)
- [ ] App loads: `https://your-app.vercel.app`
- [ ] Login works
- [ ] Dashboard shows data
- [ ] No console errors
- [ ] API calls successful (check Network tab)

### Integration
- [ ] Login successful
- [ ] Dashboard loads analytics
- [ ] Real-time updates work
- [ ] Orders page functional
- [ ] Products page loads
- [ ] Documents page works

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: "Application failed to respond"
```bash
# Check Render logs for errors
# Common issues:
# 1. MongoDB connection string incorrect
# 2. Missing environment variables
# 3. Port not set to 3000
```

**Problem**: "CORS error"
```bash
# Update CLIENT_URL in Render environment variables
# Make sure it matches your Vercel URL exactly
# Redeploy backend
```

**Problem**: "Redis connection failed"
```bash
# If Redis is optional, you can skip it
# Or create a free Redis instance on Render
```

### Frontend Issues

**Problem**: "API calls failing"
```bash
# Check VITE_API_URL in Vercel environment variables
# Make sure it points to your Render backend URL
# Redeploy frontend
```

**Problem**: "Blank page"
```bash
# Check Vercel build logs
# Make sure build command is: npm run build
# Make sure output directory is: dist
```

---

## 📊 Performance Notes

### Render Free Tier Limitations
- ⚠️ **Spins down after 15 minutes of inactivity**
- ⚠️ **First request after spin-down takes 30-60 seconds**
- ✅ Good for demos and interviews
- ✅ Upgrade to paid plan ($7/month) for always-on

### Vercel Free Tier
- ✅ Always fast and available
- ✅ Global CDN
- ✅ Perfect for frontend

---

## 🎯 Interview Demo Tips

1. **Warm up the backend** before demo:
   - Visit `https://your-backend.onrender.com/health` 5 minutes before
   - This wakes up the server if it was sleeping

2. **Have backup plan**:
   - Keep local Docker version running
   - Show local version if deployment has issues

3. **Explain the architecture**:
   - "Frontend deployed on Vercel's global CDN"
   - "Backend on Render with MongoDB Atlas"
   - "Demonstrates modern cloud deployment"

---

## 🔗 Useful Links

- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Your GitHub Repo**: https://github.com/sandeep0926/project-Full--Stack

---

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Vercel (Frontend) | Free | $0/month |
| Render (Backend) | Free | $0/month |
| Render (Redis) | Free | $0/month |
| MongoDB Atlas | Free (M0) | $0/month |
| **Total** | | **$0/month** |

**Upgrade Options** (for production):
- Render Starter: $7/month (always-on, no spin-down)
- MongoDB M10: $10/month (better performance)
- Total: ~$17/month for production-ready setup

---

## 🎉 Success!

Once deployed, you'll have:
- ✅ Live demo URL to share with interviewers
- ✅ Professional cloud deployment
- ✅ Scalable architecture
- ✅ Zero cost for demos/interviews
- ✅ Easy to update (just push to GitHub)

**Your deployed URLs**:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://enterprise-backend.onrender.com`
- API Docs: `https://enterprise-backend.onrender.com/api-docs`

Share these links in your resume and LinkedIn! 🚀
