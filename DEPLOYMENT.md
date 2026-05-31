# Free Live Hosting — Social Pro

Stack (all free tiers):

| Layer | Service | Notes |
|-------|---------|-------|
| Database | **Neon** | Already migrated + seeded ✅ |
| Redis | **Upstash** | Serverless Redis (TLS) |
| API + Web | **Render** | Two free web services via `render.yaml` |
| Object storage | **Cloudflare R2** | S3-compatible (Phase 2, for media) |

> Render free web services spin down after ~15 min idle and cold-start in ~30–50 s.

---

## Phase 1 — get the app live (login works)

### 1. Upstash Redis (free)
1. https://upstash.com → create account → **Create Database** (Redis, region close to Frankfurt).
2. From the database page copy: **Endpoint host**, **Port** (usually 6379), **Password**.

### 2. Render — deploy via Blueprint
1. https://render.com → sign up with GitHub.
2. **New → Blueprint** → select the `omergungor11/social-pro` repo. Render reads `render.yaml` and proposes two services: `social-pro-api` and `social-pro-web`.
3. Apply. Then open each service → **Environment** and fill the `sync: false` vars:

**social-pro-api** — required to boot:
```
DATABASE_URL    = <Neon POOLED connection string>
REDIS_HOST      = <Upstash endpoint host>
REDIS_PASSWORD  = <Upstash password>
CORS_ORIGIN     = https://social-pro-web.onrender.com
# Phase-1 placeholders (media disabled until Phase 2):
S3_ENDPOINT     = https://placeholder.r2.cloudflarestorage.com
S3_ACCESS_KEY   = placeholder
S3_SECRET_KEY   = placeholder
```
(JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY are auto-generated.)

**social-pro-web**:
```
NEXT_PUBLIC_API_URL = https://social-pro-api.onrender.com/api/v1
```
4. Trigger a deploy on both. The API runs `prisma migrate deploy` on start (Neon already has the schema + admin, so this is a no-op).

### 3. Log in
Open `https://social-pro-web.onrender.com` →
```
admin@socialpro.dev / 159753*a
```

---

## Phase 2 — media (Cloudflare R2)
1. Cloudflare → **R2** → create bucket `social-pro-uploads` → enable public access (or a public dev URL).
2. Create an **R2 API token** (Object Read & Write) → get Access Key ID + Secret.
3. On `social-pro-api` set:
```
S3_ENDPOINT   = https://<accountid>.r2.cloudflarestorage.com
S3_ACCESS_KEY = <R2 access key>
S3_SECRET_KEY = <R2 secret>
S3_BUCKET     = social-pro-uploads
S3_REGION     = auto
```
4. Redeploy the API. Image upload + Facebook/Twitter/Instagram media publishing now work
   (R2 public URLs are internet-reachable, so Instagram works too).

---

## Phase 3 — OAuth (connecting new accounts)
Each platform's developer console has redirect URIs pointing at the old Railway API.
Update them to the Render API, e.g.:
```
https://social-pro-api.onrender.com/api/v1/social-accounts/oauth/facebook/callback
```
(Login + already-connected accounts work without this; only NEW connections need it.)

---

## Env var reference
See `render.yaml` for the full list. Optional keys (AI, Stripe, SMTP, other OAuth)
can be added anytime without redeploying the web app.
