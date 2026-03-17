# Tech Stack

## Runtime
- Node.js 22 LTS
- Package manager: pnpm 9.x
- Build orchestration: Turborepo 2.x

## Backend
- Framework: NestJS 11.x
- Language: TypeScript 5.7+ (strict mode)
- ORM: Prisma 6.x
- Queue: BullMQ + Redis 7
- Real-time: Socket.io (via NestJS WebSocket gateway)
- Auth: JWT (access + refresh tokens)
- File Storage: S3-compatible (AWS S3 / MinIO for local dev)
- API Docs: Swagger/OpenAPI via @nestjs/swagger

## Frontend
- Framework: Next.js 15 (App Router, Server Components)
- Auth: Auth.js v5 (NextAuth)
- UI Library: shadcn/ui + Radix Primitives
- Styling: Tailwind CSS 4
- State: TanStack Query v5 + Zustand
- Charts: Recharts
- Rich Editor: Tiptap
- Date Handling: date-fns
- Form: React Hook Form + Zod

## Database
- Primary: PostgreSQL 16
- Cache/Broker: Redis 7 (caching, BullMQ, rate limiting, pub/sub)

## AI
- Anthropic SDK (Claude) — primary content generation
- OpenAI SDK — fallback / image generation

## Payments
- Stripe SDK — subscriptions, metered billing, customer portal, webhooks

## Infrastructure
- Container: Docker + docker-compose (PostgreSQL, Redis, MinIO, MailHog)
- CI/CD: GitHub Actions
- Hosting: Vercel (frontend) + Railway/AWS ECS (backend)

## Testing
- Unit/Integration: Vitest
- E2E: Playwright
- API Testing: Supertest

## Monorepo Structure
```
apps/
  web/                  → Next.js 15 frontend
  api/                  → NestJS backend
packages/
  shared-types/         → Shared TypeScript interfaces/enums
  ui/                   → Shared UI components (shadcn/ui wrapper)
  config-eslint/        → ESLint shared config
  config-ts/            → TSConfig bases
  prisma/               → Prisma schema + client
docker/                 → Docker configs
```
