# Vercel & Railway Deployment — Implementation Summary

## Overview

Social Pro is now configured for production deployment with a **decoupled frontend/backend architecture**:

- **Frontend**: Next.js 15 on Vercel (CDN-distributed, serverless)
- **Backend**: NestJS 11 on Railway.app (containerized, database + cache)
- **Databases**: PostgreSQL + Redis (managed by Railway)

---

## What Was Implemented

### 1. Vercel Configuration (`/vercel.json`)

**File**: `/Users/arlec/Desktop/Work/social-pro/vercel.json`

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

**What it does**:
- Tells Vercel to deploy **only** the `apps/web/` directory
- Uses Turborepo to build dependencies first
- Compiles Next.js standalone output (no Node.js server needed)
- Matches your Node.js version (22.x)

**Why this setup**:
- Monorepo support: Vercel can handle multiple apps but needs explicit configuration
- Dependency resolution: Turborepo respects workspace dependencies (turbo.json)
- Standalone output: Next.js runs serverlessly on Vercel's edge network

---

### 2. Deployment Documentation

Four comprehensive guides were created to support the entire deployment lifecycle:

#### A. **VERCEL_DEPLOYMENT.md** (Detailed)
**Location**: `/sp-docs/VERCEL_DEPLOYMENT.md`

**Contents**:
- Part 1: Frontend deployment (Vercel) — step-by-step
- Part 2: Backend deployment (Railway, Render, Fly.io comparison)
- Part 3: Database migrations
- Part 4: Monitoring & debugging
- Part 5: Scaling & optimization
- Part 6: CI/CD pipeline setup
- Part 7: Common issues & solutions
- Part 8: Production checklist
- Part 9: Custom domain setup
- Part 10: Local development with production-like environment

**Use this for**: Complete understanding, troubleshooting, optimization

#### B. **DEPLOYMENT_CHECKLIST.md** (Executable)
**Location**: `/sp-docs/DEPLOYMENT_CHECKLIST.md`

**Contents**:
- Pre-deployment checks (GitHub, frontend, backend, database)
- Vercel frontend deployment checklist
- Railway backend deployment checklist
- Integration testing checklist
- Security & monitoring checklist
- Rollback procedures
- Performance baseline tracking

**Use this for**: Step-by-step deployment execution, verification

#### C. **ENV_VAR_MAPPING.md** (Reference)
**Location**: `/sp-docs/ENV_VAR_MAPPING.md`

**Contents**:
- Visual architecture diagram (frontend → Vercel, backend → Railway)
- Frontend environment variables (NEXT_PUBLIC_* only)
- Backend environment variables (all server-side)
- Local development .env setup
- Where to find values (sources for each provider)
- Common mistakes and how to avoid them
- Deployment order (backend first, then frontend)
- Quick reference table

**Use this for**: Environment variable setup, provider integration, troubleshooting

#### D. **DEPLOYMENT_QUICKSTART.md** (Quick Reference)
**Location**: `/sp-docs/DEPLOYMENT_QUICKSTART.md`

**Contents**:
- 5-minute quick start guide
- Step-by-step for Railway deployment
- Step-by-step for Vercel deployment
- Database migration setup
- Verification tests
- Quick troubleshooting table

**Use this for**: Fast deployment, reference during first deployment

---

### 3. Updated Environment Configuration

**File**: `.env.example`

**Changes**:
- Added comprehensive comments explaining Vercel deployment workflow
- Separated frontend (`NEXT_PUBLIC_*`) from backend variables
- Added production vs. development notes for each variable
- Included provider setup instructions (email, S3, OAuth, etc.)
- Documented where to get each API key/secret
- Added Vercel and Railway-specific guidance

**Example format**:
```bash
# Local development
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
# PRODUCTION: Set in Vercel to https://api.socialpro.railway.app/api/v1

# Backend config
CORS_ORIGIN=http://localhost:3000
# PRODUCTION: Set in Railway to https://socialpro.vercel.app
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     Social Pro Production                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐              ┌──────────────────────┐
│    Vercel (CDN)      │              │  Railway.app (VM)    │
│  ✓ Frontend App      │◄─────API────►│  ✓ NestJS Backend   │
│  ✓ Next.js 15        │   Requests   │  ✓ Job Queue        │
│  ✓ Static Assets     │   +Auth      │                      │
│  ✓ Server Components │   +Webhooks  │  ┌────────────────┐ │
│  ✓ Serverless Funcs  │              │  │  PostgreSQL    │ │
└──────────────────────┘              │  │  (Database)    │ │
                                      │  └────────────────┘ │
                                      │                      │
         ┌─────────────────────────────│  ┌────────────────┐ │
         │                             │  │  Redis         │ │
         │     GitHub                  │  │  (Cache)       │ │
         │  (Push triggers both)       │  └────────────────┘ │
         │                             └──────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────┐
│                                                               │
│              External Services (API Keys)                    │
│  • Stripe (billing)                                          │
│  • Anthropic/OpenAI (AI content generation)                 │
│  • OAuth providers (Twitter, Facebook, LinkedIn, etc.)      │
│  • Email provider (Resend/SendGrid)                         │
│  • S3/MinIO (file storage)                                  │
│                                                               │
└────────────────────────────────────────────────────────────────┘
```

---

## Key Features of This Implementation

### 1. **Monorepo Support**
- ✅ Vercel correctly builds dependencies via Turborepo
- ✅ Turbo.json specifies build order (packages → web)
- ✅ Standalone output removes Node.js server dependency

### 2. **Frontend Optimization**
- ✅ Vercel caches builds & deployments
- ✅ CDN distribution (global edge network)
- ✅ Automatic HTTPS/SSL
- ✅ Preview deployments for pull requests
- ✅ One-click rollbacks to previous deployments

### 3. **Backend Deployment**
- ✅ Railway handles containerization automatically
- ✅ PostgreSQL & Redis included (managed services)
- ✅ Automatic restarts on failure
- ✅ Environment variables auto-linked between services
- ✅ Real-time logs and monitoring

### 4. **Security**
- ✅ Environment variables separated by platform
- ✅ Secrets never exposed in repository
- ✅ CORS configured per deployment
- ✅ OAuth callbacks updated to production domains
- ✅ JWT secrets must be strong (documented)

### 5. **Environment Management**
- ✅ Local development: `.env.local`
- ✅ Frontend (Vercel): `NEXT_PUBLIC_*` variables only
- ✅ Backend (Railway): All server-side variables
- ✅ Clear separation of concerns
- ✅ Easy to track per environment

### 6. **Documentation**
- ✅ 4 guides covering all aspects
- ✅ Step-by-step instructions
- ✅ Quick reference tables
- ✅ Troubleshooting section
- ✅ Rollback procedures
- ✅ Performance baselines

---

## Deployment Flow (How It Works)

### 1. Local Development
```bash
# Developer works locally with .env.local
pnpm dev
# Runs both frontend (port 3000) and backend (port 4000)
```

### 2. Git Push to Main
```bash
git push origin main
```

### 3. Automatic Deployment (GitHub → Vercel)
```
1. GitHub push event
2. Vercel webhook triggered
3. Install: pnpm install (installs all workspace packages)
4. Build: pnpm turbo build --filter=web
   - Builds dependencies first (turbo.json: ^build)
   - Generates Prisma client
   - Builds Next.js app
5. Output: .next/ directory
6. Deploy: Vercel serves via CDN + serverless functions
```

### 4. Automatic Deployment (GitHub → Railway)
```
1. GitHub push event
2. Railway webhook triggered
3. Pull latest code
4. Build: pnpm turbo build --filter=api
5. Start: pnpm --filter api start:prod
6. Server listens on PORT=4000
7. Connected to PostgreSQL & Redis
```

### 5. Frontend-Backend Communication
```
Browser → Vercel
  ↓ (NEXT_PUBLIC_API_URL = https://api.socialpro.railway.app/api/v1)
Railway API
  ↓ (connects to PostgreSQL + Redis)
Database & Cache
  ↓ (OAuth → Twitter/Facebook/LinkedIn/TikTok)
Social Platforms
```

---

## What You Need to Do

### Quick Start (5 minutes)
1. **Follow** `sp-docs/DEPLOYMENT_QUICKSTART.md`
2. Set up Railway backend (add PostgreSQL, Redis, env vars)
3. Set up Vercel frontend (add env vars)
4. Update CORS in backend
5. Run database migrations
6. Test integration

### Detailed Setup (30 minutes)
1. **Read** `sp-docs/VERCEL_DEPLOYMENT.md` (understand everything)
2. **Use** `sp-docs/DEPLOYMENT_CHECKLIST.md` (execute step by step)
3. **Reference** `sp-docs/ENV_VAR_MAPPING.md` (set variables correctly)
4. Verify each checkpoint before moving to next
5. Run integration tests

### Provider Setup (Varies by provider)
- **Email**: Resend, SendGrid, AWS SES, etc. (get API key)
- **S3**: AWS S3 bucket (get access key + secret)
- **OAuth**: Twitter, Facebook, LinkedIn, TikTok, Google apps (get client ID + secret)
- **Stripe**: Get live API keys
- **AI**: Anthropic or OpenAI API keys

---

## Important Notes

### Environment Variables

**Frontend (Vercel)**:
- Only `NEXT_PUBLIC_*` variables are available
- Set in Vercel Dashboard → Project Settings → Environment Variables
- Embedded at build time (visible in browser)
- Must be set BEFORE deployment

**Backend (Railway)**:
- All variables stored securely (not visible in browser)
- Set in Railway Dashboard → Service → Variables
- Auto-loaded on service startup
- Can be updated without rebuilding

**Local Development**:
- Use `.env.local` for all variables
- Git-ignored (not committed)
- Copy from `.env.example` as template

### Build & Deployment

**Vercel**:
- Auto-deploys on main branch push
- Uses vercel.json configuration
- Caches builds for speed
- Can revert to previous deployment instantly

**Railway**:
- Auto-deploys on main branch push
- Auto-restarts on failures
- Logs available in real-time
- Can promote previous deployments

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| "NEXT_PUBLIC_API_URL is not defined" | Add to Vercel env vars, redeploy |
| CORS error in browser | Update CORS_ORIGIN in Railway to Vercel domain |
| 502 Bad Gateway | Check Railway logs, verify PostgreSQL connected |
| API calls to localhost | Update NEXT_PUBLIC_API_URL to Railway domain |
| Migrations fail | SSH into Railway: `railway run npx prisma migrate deploy` |
| OAuth callbacks fail | Update callback URLs to Railway domain in OAuth provider settings |

---

## Performance Metrics to Monitor

### Frontend (Vercel)
- **First Contentful Paint (FCP)**: < 2 seconds
- **Largest Contentful Paint (LCP)**: < 4 seconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- Check in: Vercel Analytics, Lighthouse

### Backend (Railway)
- **Response Time (p50)**: < 500ms
- **Response Time (p95)**: < 1 second
- **Error Rate**: < 1%
- **Database Query Time**: < 100ms
- Check in: Railway Metrics, Application Insights

---

## Files Created

| File | Purpose |
|------|---------|
| `/vercel.json` | Vercel build configuration |
| `/sp-docs/VERCEL_DEPLOYMENT.md` | Complete deployment guide (1600+ lines) |
| `/sp-docs/DEPLOYMENT_CHECKLIST.md` | Executable checklist (~400 items) |
| `/sp-docs/ENV_VAR_MAPPING.md` | Environment variable reference |
| `/sp-docs/DEPLOYMENT_QUICKSTART.md` | 5-minute quick start |
| `.env.example` | Updated with production notes |

---

## Next Steps After Deployment

1. **Monitoring**
   - Enable Vercel Analytics
   - Enable Railway Metrics
   - Set up error tracking (Sentry, DataDog, etc.)

2. **Scaling**
   - Monitor CPU/memory in Railway
   - Add caching layers if needed
   - Optimize database queries

3. **Security**
   - Rotate JWT secrets periodically
   - Enable 2FA on Vercel & Railway
   - Audit OAuth scopes

4. **Backups**
   - Enable PostgreSQL backups in Railway
   - Test recovery procedure
   - Document backup retention policy

5. **Maintenance**
   - Monitor dependency updates
   - Plan maintenance windows
   - Document runbooks for common issues

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Prisma Docs**: https://www.prisma.io/docs
- **NestJS Docs**: https://docs.nestjs.com
- **Next.js Docs**: https://nextjs.org/docs

---

## Deployment Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Setup Railway backend | 5 min | Ready |
| 2. Setup Vercel frontend | 5 min | Ready |
| 3. Configure environment vars | 5 min | Ready |
| 4. Run migrations | 2 min | Ready |
| 5. Integration testing | 10 min | Ready |
| **Total** | **~30 min** | **Ready to deploy** |

---

## Success Criteria

Deployment is successful when:

- ✅ Frontend loads at `https://socialpro.vercel.app`
- ✅ Backend API reachable at `https://api.socialpro.railway.app/api/v1`
- ✅ No CORS errors in browser
- ✅ User authentication flows (register → login)
- ✅ API calls use correct backend domain
- ✅ Database migrations completed
- ✅ Environment variables properly set
- ✅ Error rate < 1%
- ✅ Response time < 1 second (p95)
- ✅ Can rollback to previous deployment instantly

---

**Status**: ✅ **Ready for Production Deployment**

All necessary files created, configuration validated, documentation complete.

**Last Updated**: March 25, 2026
**Created By**: Claude Code (Deployment Engineer)
