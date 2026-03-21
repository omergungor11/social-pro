# Social Pro

## Proje

Social Pro — ajanslar icin kapsamli sosyal medya yonetim ve musteri yonetim paneli. Coklu platform destegi (X, Facebook, Instagram, LinkedIn, TikTok, YouTube), AI ile icerik uretimi, post zamanlama, analitik, odeme sistemi ve toplu musteri yonetimi.

- **Hedef Kitle**: Dijital pazarlama ajanslari
- **Mimari**: Multi-tenant SaaS (her ajans bir tenant)

## Slash Commandlar

| Command | Ne yapar |
|---------|----------|
| `/cold-start` | Session baslangici — projeyi oku, durumu raporla |
| `/git-full` | Stage, commit, push — task durumlarini guncelle |
| `/local-testing` | Tum servisleri ayaga kaldir ve dogrula |
| `/turn-off` | Session notu yaz, tasklari isaretle, push, kapat |
| `/new-project` | Yeni proje icin workflow yapisi kur |

---

## Mevcut Durum

**Progress**: 79/87 task (%91) — Phase 0-9 tamamlandi, Phase 10 basliyor. Dev ortam calisiyor, frontend sayfalari zenginlestirildi.

> Her yeni session'da `sp-tasks/task-index.md` oku veya `/cold-start` calistir.

---

## Workspace

```
apps/
  api/                  → NestJS 11 backend (REST API)
  web/                  → Next.js 15 frontend (App Router)
packages/
  shared-types/         → Shared TypeScript interfaces/enums
  ui/                   → Shared UI components (shadcn/ui)
  prisma/               → Prisma schema + client
  config-eslint/        → Shared ESLint config
  config-ts/            → Shared TSConfig bases
docker/                 → Docker configs
sp-tasks/               → Task tracking
sp-config/              → Proje kurallari
sp-docs/                → Kalici hafiza + changelog
sp-plans/               → Uygulama planlari
```

## Temel Komutlar

```bash
pnpm dev                        # Start all dev servers (turbo)
pnpm build                      # Build all packages + apps
pnpm typecheck                  # TypeScript check (monorepo)
pnpm lint                       # ESLint (monorepo)
pnpm test                       # Run all tests
pnpm --filter api dev           # Only backend
pnpm --filter web dev           # Only frontend
npx prisma migrate dev          # Run DB migrations
npx prisma generate             # Generate Prisma client
npx prisma db seed              # Seed database
docker compose up -d            # Start infra (PostgreSQL, Redis, MinIO, MailHog)
```

---

## Code Conventions (Kisa)

- **TypeScript**: strict, `any` yasak, explicit return types
- **Dosya**: `kebab-case`, `.service.ts` / `.controller.ts` / `.module.ts` / `.dto.ts`
- **API**: RESTful `/api/v1/{resource}`, response `{ data, meta? }`, error `{ error: { statusCode, code, message } }`
- **Multi-tenant**: Her query `agency_id` ile scope'lu, TenantGuard zorunlu
- **Commit**: `feat(TASK-XXX): aciklama` + `Co-Authored-By: Claude <noreply@anthropic.com>`

Detaylar → `sp-config/conventions.md`

## Parallel Agent Orchestration

Birden fazla sub-agent paralel calistirilirken:
- Her agent sadece kendi modul dizininde dosya duzenler (dizin izolasyonu)
- Backend: `apps/api/src/modules/{modul}/` — her modul ayri agent
- Frontend: `apps/web/app/(dashboard)/{sayfa}/` — her sayfa ayri agent
- Paket kurulumu sadece ana agent (orchestrator) tarafindan yapilir
- Schema degisiklikleri sirayla yapilir (tek agent)
- Paylasilan dosyalarda retry pattern uygulanir (max 3)

Detaylar → `sp-config/agent-instructions.md`

---

## Referans Dizinleri

| Dizin | Icerik |
|-------|--------|
| `sp-tasks/task-index.md` | Master task listesi (87 task, 11 phase) |
| `sp-tasks/phases/` | Phase bazli detayli task aciklamalari |
| `sp-tasks/active/session-notes.md` | Session notlari |
| `sp-config/workflow.md` | Task workflow kurallari |
| `sp-config/conventions.md` | Kod standartlari |
| `sp-config/tech-stack.md` | Teknolojiler + versiyonlar |
| `sp-config/agent-instructions.md` | Sub-agent sorumluluklari |
| `sp-docs/MEMORY.md` | Kalici hafiza |
| `sp-docs/CHANGELOG.md` | Degisiklik kaydi |
| `sp-plans/` | Uygulama planlari |

---

## Hooks (Otomatik Kurallar)

| Hook | Tetikleyici | Ne yapar |
|------|------------|----------|
| `protect-files.sh` | PreToolUse (Edit/Write) | .env, lock files, .git/, credentials duzenlemeyi bloklar |
| `post-edit-prisma.sh` | PostToolUse (Edit) | schema.prisma degistiginde otomatik `prisma generate` calistirir |

---

## NestJS Backend Modulleri

| Modul | Sorumluluk |
|-------|------------|
| `auth` | Register, login, JWT, password reset |
| `tenant` | TenantGuard, multi-tenant Prisma, AsyncLocalStorage |
| `team` | AgencyMember, invitations, roles |
| `client` | Client CRUD, groups, bulk operations |
| `social-account` | OAuth connect/disconnect, token refresh |
| `post` | Post CRUD, scheduling |
| `publisher` | Platform-specific post publishing (adapter pattern) |
| `media` | File upload, S3 storage, image/video processing |
| `analytics` | Platform metrics fetch, aggregation, reports |
| `ai` | Content generation (Claude/OpenAI), templates |
| `billing` | Stripe subscriptions, usage tracking, limits |
| `notification` | In-app notifications, email, WebSocket |
| `webhook` | Inbound webhooks from social platforms + Stripe |
| `queue` | BullMQ job definitions + processors |
| `audit` | Activity logging |
| `common` | Shared guards, interceptors, decorators, pipes |

---

## Notlar

- Hafiza dosyasi `sp-docs/MEMORY.md`'de — her session'da oku, gerektiginde guncelle
- Multi-tenant: her tablo agency_id iceriyor, Prisma extension ile otomatik scope
- Token'lar AES-256-GCM ile encrypted
- Post publish: BullMQ delayed jobs + safety net cron
- Plan limitleri: PlanLimitGuard ile enforce edilir
