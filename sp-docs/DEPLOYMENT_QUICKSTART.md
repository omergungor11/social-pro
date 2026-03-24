# Vercel & Railway Deployment — Quick Start

5-minute setup guide to deploy Social Pro to production.

## Prerequisites

- [ ] GitHub repo code up to date
- [ ] All changes committed to main branch
- [ ] Vercel account created (https://vercel.com)
- [ ] Railway account created (https://railway.app)

---

## Step 1: Deploy Backend to Railway (5 minutes)

### 1.1 Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select `social-pro` repo from your GitHub
4. Authorize Railway

### 1.2 Add Services

Railway dashboard → Click **"+ New"** service:
- [ ] Add **PostgreSQL** (auto-creates `DATABASE_URL`)
- [ ] Add **Redis** (auto-creates `REDIS_URL`)

Wait for services to start (1-2 minutes).

### 1.3 Set Environment Variables

Railway dashboard → Select **API service** → **Variables** tab:

```bash
NODE_ENV=production
PORT=4000
API_URL=https://api.socialpro.railway.app  # Replace with your Railway domain
CORS_ORIGIN=https://socialpro.vercel.app    # Will update after Vercel deployment

# Secrets (generate below)
JWT_SECRET=[run: openssl rand -hex 32]
JWT_REFRESH_SECRET=[run: openssl rand -hex 32]
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=[run: openssl rand -hex 32]

# Email (example: Resend)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=[your-resend-api-key]
SMTP_FROM=noreply@socialpro.dev

# S3 (example: AWS)
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=[your-aws-key]
S3_SECRET_KEY=[your-aws-secret]
S3_BUCKET=social-pro-media
S3_REGION=us-east-1

# Stripe
STRIPE_SECRET_KEY=sk_live_[your-stripe-live-key]
STRIPE_WEBHOOK_SECRET=whsec_[your-stripe-webhook-secret]
STRIPE_PUBLISHABLE_KEY=pk_live_[your-stripe-live-key]

# AI APIs
ANTHROPIC_API_KEY=sk-ant-[your-anthropic-key]
OPENAI_API_KEY=sk-[your-openai-key]

# OAuth (Twitter/X, Facebook, LinkedIn, TikTok, Google)
# Fill in based on your app registrations
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
TWITTER_CALLBACK_URL=https://api.socialpro.railway.app/api/v1/social-accounts/twitter/callback

# ... (see ENV_VAR_MAPPING.md for all OAuth variables)
```

### 1.4 Deploy Backend

1. Add variables one at a time (click **"Add Variable"** in dashboard)
2. Railway auto-deploys when you save variables
3. Wait for **green checkmark** next to API service (1-2 minutes)
4. Copy your Railway domain from **Settings** → **Domain** (e.g., `api.socialpro.railway.app`)

---

## Step 2: Deploy Frontend to Vercel (3 minutes)

### 2.1 Create Vercel Project

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Paste: `https://github.com/omergungor11/social-pro`
5. Click **"Import"**
6. Vercel auto-detects `vercel.json` configuration

### 2.2 Set Environment Variables

Vercel dashboard → **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://api.socialpro.railway.app/api/v1
NEXT_PUBLIC_APP_URL=https://socialpro.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[your-stripe-key]
```

**Important**: Select environments: **Production**, **Preview**, **Development**

### 2.3 Deploy

1. Vercel auto-deploys after env vars are set
2. Wait for **"Ready"** status in Deployments tab (1-2 minutes)
3. Click deployment to visit site
4. Note your Vercel URL (e.g., `https://socialpro.vercel.app`)

---

## Step 3: Update Backend CORS

Back to Railway:

1. Select **API service** → **Variables** tab
2. Find `CORS_ORIGIN` variable
3. Update to your Vercel URL: `https://socialpro.vercel.app`
4. Save (service restarts, ~30 seconds)

---

## Step 4: Run Database Migrations

1. Railway dashboard → API service → **Logs** tab
2. Find the IP/command to SSH into service (shown in logs)
3. Or use Railway CLI:
   ```bash
   railway run npx prisma migrate deploy
   ```
4. Migrations complete (~10 seconds)

---

## Step 5: Verify Deployment

### Test Backend

```bash
# Replace with your Railway domain
curl https://api.socialpro.railway.app/api/v1/auth/health
# Should return 200 OK
```

### Test Frontend

1. Open `https://socialpro.vercel.app` in browser
2. Open DevTools → Network tab
3. Go to login page
4. Check network requests go to your Railway domain
5. Try registering or logging in
6. Should work without CORS errors

---

## Troubleshooting (2 minutes)

| Issue | Fix |
|-------|-----|
| "NEXT_PUBLIC_API_URL is not defined" | Add `NEXT_PUBLIC_API_URL` to Vercel env vars, then redeploy |
| CORS error in browser console | Update `CORS_ORIGIN` in Railway to your Vercel domain |
| Database connection failed | Ensure PostgreSQL service is added to Railway project |
| 502 Bad Gateway | Check Railway logs for startup errors; verify `PORT=4000` |
| OAuth callback failing | Update `*_CALLBACK_URL` vars to use Railway domain |

---

## Next Steps

1. Test all features (login, posting, analytics, billing)
2. Set up custom domains:
   - Vercel: Settings → Domains → Add domain
   - Railway: Service Settings → Custom Domain
3. Configure monitoring/logging
4. Set up backup strategy for database
5. Add CI/CD checks (GitHub Actions optional)

---

## Environment Variable Quick Copy-Paste

Generate secret values:
```bash
# Run these locally
openssl rand -hex 32  # JWT_SECRET
openssl rand -hex 32  # JWT_REFRESH_SECRET
openssl rand -hex 32  # ENCRYPTION_KEY
```

Save the output for use in Railway variables.

---

## Files Created

- `/vercel.json` — Vercel configuration (auto-detected)
- `/sp-docs/VERCEL_DEPLOYMENT.md` — Detailed deployment guide
- `/sp-docs/DEPLOYMENT_CHECKLIST.md` — Complete checklist
- `/sp-docs/ENV_VAR_MAPPING.md` — Environment variable reference
- `/sp-docs/DEPLOYMENT_QUICKSTART.md` — This file

---

## Reference Docs

- **Detailed Guide**: `sp-docs/VERCEL_DEPLOYMENT.md`
- **Full Checklist**: `sp-docs/DEPLOYMENT_CHECKLIST.md`
- **Env Variable Reference**: `sp-docs/ENV_VAR_MAPPING.md`
- **Vercel.json Config**: `vercel.json` (repo root)

---

## Support

- Vercel Issues: https://vercel.com/support
- Railway Issues: https://railway.app/support
- Prisma Issues: https://www.prisma.io/docs

---

**Total Setup Time**: ~10 minutes (most time is waiting for deployments)

**You're done!** 🚀 Your Social Pro app is now live in production.

---

**Last Updated**: March 25, 2026
**Author**: Claude Code
