# Vercel Deployment Guide — Social Pro

## Overview

Social Pro is a **monorepo** (pnpm + Turborepo) with separate frontend and backend applications:

- **Frontend**: `apps/web/` — Next.js 15 (App Router) → **Vercel**
- **Backend**: `apps/api/` — NestJS 11 → **Railway.app**, **Render.com**, or **Fly.io**
- **Packages**: Shared libraries (`shared-types`, `ui`, `prisma`, config)

This guide covers **Vercel frontend deployment** and documents backend deployment strategies.

---

## Part 1: Frontend Deployment (Vercel)

### Prerequisites

- GitHub repo synced and up to date: https://github.com/omergungor11/social-pro
- Vercel account created: https://vercel.com/signup
- Git remote properly configured

### Step 1: Connect to Vercel

#### Via Vercel Dashboard (Recommended)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..." → "Project"**
3. Select **"Import Git Repository"**
4. Paste: `https://github.com/omergungor11/social-pro`
5. Click **"Import"**

#### Configure Build Settings

Vercel auto-detects `vercel.json` at the root. It will use:

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm turbo build --filter=web",
  "installCommand": "pnpm install",
  "outputDirectory": "apps/web/.next",
  "rootDirectory": "apps/web",
  "nodeVersion": "22.x"
}
```

**Key points:**
- `rootDirectory`: Tells Vercel to deploy `apps/web/` only
- `buildCommand`: Uses Turborepo to build dependencies first (`^build` in turbo.json)
- `outputDirectory`: Next.js standalone output
- `nodeVersion`: Matches your local Node.js version (22.x)

### Step 2: Configure Environment Variables

In **Vercel Dashboard → Project Settings → Environment Variables**:

#### Required Variables

Add these environment variables (all are `NEXT_PUBLIC_*` so they're embedded in frontend):

| Variable | Example | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.socialpro.dev/api/v1` | Your deployed backend API URL + `/api/v1` path |
| `NEXT_PUBLIC_APP_URL` | `https://socialpro.vercel.app` | Your Vercel deployment URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Stripe public key for billing |

#### Setting Variables

```bash
# Via CLI (requires Vercel CLI)
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://api.socialpro.dev/api/v1

vercel env add NEXT_PUBLIC_APP_URL
# Enter: https://socialpro.vercel.app

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Enter: pk_live_...
```

Or manually in Vercel Dashboard:
1. Project Settings → Environment Variables
2. Add each variable
3. Select environments: **Production**, **Preview**, **Development**
4. Save

### Step 3: Configure CORS on Backend

Your deployed NestJS backend must allow CORS from the Vercel domain.

In `apps/api/src/main.ts`:

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  credentials: true,
});
```

Backend env var to set (when deployed):

```bash
CORS_ORIGIN=https://socialpro.vercel.app
```

### Step 4: Deploy Frontend

Once environment variables are set:

1. Push changes to GitHub:
   ```bash
   git add vercel.json
   git commit -m "feat: add Vercel deployment configuration"
   git push origin main
   ```

2. Vercel auto-deploys on `git push` to main branch

3. Monitor deployment:
   - **Vercel Dashboard** → Your project → **Deployments** tab
   - Logs visible in real-time during build

### Step 5: Verify Deployment

Once deployment succeeds:

```bash
# Visit your Vercel URL (e.g., https://socialpro.vercel.app)
# Check browser console for any API errors
# Try logging in — should call your backend API
```

**Troubleshooting:**

If you see `NEXT_PUBLIC_API_URL is not defined` error:
- Environment variables not set in Vercel
- Variables don't have the `NEXT_PUBLIC_` prefix
- Rebuild deployment: Vercel Dashboard → **Deployments** → **...** → **Redeploy**

---

## Part 2: Backend Deployment (NestJS)

### Architecture Note

NestJS cannot run on Vercel (serverless functions don't support long-lived server processes). Options:

| Platform | Cost | Setup | Recommendations |
|----------|------|-------|-----------------|
| **Railway.app** | ~$5-50/month | 2 min | Easiest, great DX, supports Postgres + Redis |
| **Render.com** | ~$7-100/month | 3-5 min | Free tier available, good documentation |
| **Fly.io** | ~$3-50/month | 5-10 min | Global deployment, best performance |
| **AWS ECS/EC2** | Variable | 20+ min | Complex but most control |

### Recommended: Railway.app Deployment

#### Prerequisites

- Railway account: https://railway.app
- GitHub repo connected to Railway
- NestJS backend code pushed to GitHub

#### Step 1: Create Railway Project

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your GitHub organization and repo (`social-pro`)
4. Authorize Railway with GitHub
5. Choose `apps/api` as the service path (or Railway auto-detects)

#### Step 2: Add PostgreSQL & Redis Services

In Railway project:

1. Click **"+ New"** button
2. Add **PostgreSQL**
   - Railway auto-generates `DATABASE_URL`
3. Add **Redis**
   - Railway auto-generates `REDIS_URL` or variables

#### Step 3: Configure Environment Variables

In Railway dashboard for your API service:

```bash
# Core
NODE_ENV=production
PORT=4000
API_URL=https://api.socialpro.railway.app  # Replace with your Railway domain

# Database (auto-generated by PostgreSQL service)
# DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis (auto-generated by Redis service)
# REDIS_URL=redis://default:pass@host:6379

# CORS (allow your Vercel frontend)
CORS_ORIGIN=https://socialpro.vercel.app

# JWT
JWT_SECRET=your-production-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-production-refresh-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# S3 / Object Storage
# Option A: Use Railway S3 integration (recommended)
# Option B: Use AWS S3
# Option C: Use MinIO (self-hosted)
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=your-aws-access-key
S3_SECRET_KEY=your-aws-secret-key
S3_BUCKET=social-pro-media
S3_REGION=us-east-1

# Email (SMTP)
SMTP_HOST=smtp.resend.com  # or SendGrid, AWS SES, etc.
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your-resend-api-key
SMTP_FROM=noreply@socialpro.dev

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# AI Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# OAuth (Social Accounts)
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
TWITTER_CALLBACK_URL=https://api.socialpro.railway.app/api/v1/social-accounts/twitter/callback

FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_CALLBACK_URL=https://api.socialpro.railway.app/api/v1/social-accounts/facebook/callback

LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_CALLBACK_URL=https://api.socialpro.railway.app/api/v1/social-accounts/linkedin/callback

TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
TIKTOK_CALLBACK_URL=https://api.socialpro.railway.app/api/v1/social-accounts/tiktok/callback

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://api.socialpro.railway.app/api/v1/social-accounts/youtube/callback

# Token Encryption
ENCRYPTION_KEY=your-32-byte-hex-encryption-key-change-in-prod
```

#### Step 3: Configure Deployment

Railway auto-detects NestJS from `package.json`. Verify in **Service Settings**:

- **Build Command**: `npm run build` or `pnpm build`
- **Start Command**: `npm run start:prod` or `pnpm start:prod`

Update if needed:

```bash
# If using Turborepo:
Build Command: cd ../.. && pnpm turbo build --filter=api
Start Command: pnpm --filter api start:prod
```

#### Step 4: Deploy

Push to GitHub:

```bash
git add .
git commit -m "fix: update API backend env vars for production"
git push origin main
```

Railway auto-deploys on main branch push. Monitor:
- Railway Dashboard → **Deployments** tab
- View logs in real-time

#### Step 5: Verify Backend

```bash
# Get your Railway API domain from dashboard
# Example: https://api.socialpro.railway.app

# Test API endpoint
curl https://api.socialpro.railway.app/api/v1/auth/health

# Should return 200 OK (or health check response)
```

#### Step 6: Update Frontend Environment Variables

Once backend is deployed at `https://api.socialpro.railway.app`:

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Update `NEXT_PUBLIC_API_URL`:
   ```
   https://api.socialpro.railway.app/api/v1
   ```
3. Trigger a redeploy:
   - **Deployments** → **...** → **Redeploy**

---

## Part 3: Database Migrations

### Initial Setup

After deploying backend, run migrations on production database:

```bash
# Via Railway CLI (if connected)
railway run npx prisma migrate deploy

# Or via SSH + Railway shell
railway run bash
# Then:
npx prisma migrate deploy
```

### One-Time Seed (Optional)

To seed initial data:

```bash
railway run npx prisma db seed
```

---

## Part 4: Monitoring & Debugging

### Vercel Frontend

**Logs:**
- Vercel Dashboard → **Functions** tab (server-side logs)
- Browser DevTools → **Console** (client-side errors)
- `vercel logs` CLI command

**Troubleshooting:**
- Check `NEXT_PUBLIC_*` environment variables in Vercel Settings
- Verify backend CORS allows Vercel domain
- Check browser Network tab for API errors

### Railway Backend

**Logs:**
- Railway Dashboard → **Logs** tab (real-time logs)
- View deployment output
- SSH into service for debugging

**Troubleshooting:**
- Verify `DATABASE_URL` is set (auto-generated)
- Check `PORT` is set to `4000` or Railway default
- Verify JWT secrets are set
- Check S3/email/OAuth secrets

---

## Part 5: Scaling & Optimization

### Frontend (Vercel)

- Vercel handles scaling automatically
- Use **Analytics** tab to monitor performance
- Leverage ISR (Incremental Static Regeneration) for frequently-updated pages
- Cache API responses with SWR/React Query

### Backend (Railway)

- Start with a single compute unit
- Monitor CPU/memory in Railway dashboard
- Scale horizontally with multiple replicas if needed
- Use Redis caching to reduce database load
- Consider BullMQ job queue for async tasks

---

## Part 6: CI/CD Pipeline

### Current Setup

- GitHub → Vercel (auto-deploys frontend on push)
- GitHub → Railway (auto-deploys backend on push)

### Adding Checks

Consider adding pre-deployment checks:

1. **TypeScript**: `pnpm typecheck`
2. **ESLint**: `pnpm lint`
3. **Tests**: `pnpm test`

Add to GitHub Actions (optional):

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```

---

## Part 7: Common Issues & Solutions

### Issue 1: `NEXT_PUBLIC_API_URL is not defined`

**Cause**: Environment variable not set in Vercel or missing `NEXT_PUBLIC_` prefix

**Solution**:
1. Vercel Dashboard → Project Settings → Environment Variables
2. Add `NEXT_PUBLIC_API_URL` (exactly as written)
3. Set value: `https://api.socialpro.railway.app/api/v1`
4. Redeploy

### Issue 2: CORS errors in browser console

**Cause**: Backend CORS not allowing Vercel domain

**Solution**:
1. Update backend `CORS_ORIGIN` env var to Vercel URL
2. Redeploy backend
3. Clear browser cache and reload

### Issue 3: 502 Bad Gateway on Vercel

**Cause**: API is unreachable or returning errors

**Solution**:
1. Verify backend is deployed and running
2. Check backend logs in Railway
3. Verify `NEXT_PUBLIC_API_URL` is correct
4. Test endpoint directly: `curl https://api.socialpro.railway.app/api/v1/auth/health`

### Issue 4: Prisma client not generated on build

**Cause**: `prisma generate` not running during build

**Solution**: Add post-install hook in `apps/api/package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

Or ensure build command includes it:

```bash
Build Command: pnpm turbo build --filter=api
# This runs packages/prisma generate (dependency in turbo.json)
```

---

## Part 8: Production Checklist

- [ ] Frontend deployed on Vercel
- [ ] Backend deployed on Railway
- [ ] `NEXT_PUBLIC_API_URL` set in Vercel env vars
- [ ] `CORS_ORIGIN` set in Railway env vars
- [ ] Database migrations run on production
- [ ] Seed data loaded (if needed)
- [ ] JWT secrets set (strong, random values)
- [ ] Stripe keys configured (live keys)
- [ ] OAuth keys configured (Twitter, Facebook, LinkedIn, etc.)
- [ ] S3/MinIO keys configured
- [ ] Email provider configured (SMTP/Resend)
- [ ] Frontend tested against production API
- [ ] SSL/TLS working (Vercel & Railway handle this)
- [ ] Monitoring enabled (logs accessible)
- [ ] Backups configured (Railway auto-handles)

---

## Part 9: Custom Domain Setup

### Vercel Domain

1. Vercel Dashboard → **Domains**
2. Add domain (e.g., `socialpro.dev`)
3. Update DNS records at registrar

### Railway Domain

1. Railway Dashboard → Project Settings → **Custom Domain**
2. Add domain (e.g., `api.socialpro.dev`)
3. Update DNS records at registrar

---

## Part 10: Local Development

To test production-like environment locally:

```bash
# Set Vercel environment variables locally
export NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
export NEXT_PUBLIC_APP_URL=http://localhost:3000

# Start both services
pnpm dev

# Or separately:
pnpm --filter web dev
pnpm --filter api dev
```

---

## References

- [Vercel Next.js Documentation](https://vercel.com/docs/frameworks/nextjs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Railway App Deployment Guide](https://docs.railway.app)
- [NestJS Deployment](https://docs.nestjs.com/deployment)
- [Prisma Production Deployment](https://www.prisma.io/docs/deploy/deploy-to-production)

---

## Support

For issues:
1. Check Vercel logs: Vercel Dashboard → **Deployments** → **Logs**
2. Check Railway logs: Railway Dashboard → **Logs**
3. Check browser console for frontend errors
4. Review this guide's troubleshooting section

---

**Last Updated**: March 25, 2026
**Author**: Claude Code
