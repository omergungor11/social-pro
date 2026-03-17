# Social Pro - Project Memory

## Project Info
- Social Pro — ajanslar icin kapsamli sosyal medya yonetim ve musteri yonetim SaaS paneli
- Hedef kitle: dijital pazarlama ajanslari
- Multi-tenant mimari (her ajans bir tenant)

## Tech Stack
- Monorepo: pnpm 9 + Turborepo 2
- Backend: NestJS 11 + TypeScript 5.7+
- Frontend: Next.js 15 (App Router) + Tailwind CSS 4 + shadcn/ui
- Database: PostgreSQL 16 + Prisma 6
- Cache/Queue: Redis 7 + BullMQ
- Auth: JWT (access + refresh) + Auth.js v5
- Payments: Stripe (subscriptions + metered billing)
- AI: Anthropic SDK (Claude) + OpenAI SDK
- Storage: S3/MinIO
- Real-time: Socket.io via NestJS gateway
- Testing: Vitest + Playwright

## Project Status
- **Phase 0**: PENDING — Project setup (7 tasks)
- **Phase 1**: PENDING — Auth & multi-tenancy (10 tasks)
- **Phase 2**: PENDING — Client management (8 tasks)
- **Phase 3**: PENDING — Social account connections (9 tasks)
- **Phase 4**: PENDING — Media upload & storage (5 tasks)
- **Phase 5**: PENDING — Post creation & scheduling (10 tasks)
- **Phase 6**: PENDING — AI content generation (7 tasks)
- **Phase 7**: PENDING — Analytics & reporting (8 tasks)
- **Phase 8**: PENDING — Billing & subscriptions (8 tasks)
- **Phase 9**: PENDING — Notifications & real-time (7 tasks)
- **Phase 10**: PENDING — Polish, testing & deploy (8 tasks)
- **Total**: 87 tasks

## Key Technical Decisions
- Monorepo with pnpm + Turborepo (fast installs, build caching)
- Modular monolith backend (NestJS modules, not microservices — can split later)
- Multi-tenant via row-level agency_id + Prisma client extension
- OAuth token encryption with AES-256-GCM
- Strategy/adapter pattern for platform-specific publishing and analytics
- BullMQ for all async work (post publishing, analytics fetch, media processing, email)
- Stripe for billing (subscriptions + customer portal + webhooks)

## Important Patterns
- Every tenant-scoped table has agency_id as first FK
- Platform adapters implement common interfaces (SocialOAuthConnector, PlatformPublisher, AnalyticsFetcher)
- All background jobs are idempotent (safe to retry)
- Token bucket rate limiting per platform (Redis-based)
- Pre-signed URLs for large file uploads

## Known Issues / Gotchas
- None yet

## Working Credentials (Dev)
- PostgreSQL: localhost:5432, user: postgres, password: postgres, db: social_pro_dev
- Redis: localhost:6379
- MinIO: localhost:9000, access: minioadmin, secret: minioadmin
- MailHog: localhost:8025 (UI), localhost:1025 (SMTP)
