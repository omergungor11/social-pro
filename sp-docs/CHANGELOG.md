# Changelog

## 2026-06-26

### Added
- Onay is akisi (post approval): DRAFT post `request-approval` ile `PENDING_APPROVAL`'a gecer; OWNER/ADMIN `approve`/`reject` (reject'te yorum zorunlu) ile DRAFT'a dondurur. Yeni `PostApprovalService` + 3 endpoint (`POST /posts/:id/request-approval`, `.../approvals/:approvalId/approve|reject`), in-app bildirimler (`APPROVAL_REQUESTED` / `APPROVAL_DECISION`), `PostApproval.approvedAt` kolonu, `PENDING_APPROVAL` PostStatus. Frontend: post detayinda Submit-for-Approval / Approve / Reject aksiyonlari, bekleme banneri ve son red notu.
- Yayin kuyrugu (queue slots): haftalik tekrar eden gonderim zamanlari (`PostingSlot` modeli + migration) ve bunlara DRAFT post dagitan toplu zamanlama. Yeni `QueueSlotService` + `QueueController` (`GET/POST/DELETE /posting-slots`, `POST /posts/bulk-schedule`). Frontend: posts sayfasinda "Queue" yoneticisi (gun/saat slot ekle-sil, opsiyonel hesap kapsami) ve secili draftlar icin "Add to queue" toplu aksiyonu. `PENDING_APPROVAL` durumu liste/takvim/filtrelerde ilk sinif.
- Dayanikli yayinlama: platform API cagrilarinda per-agency rate limit kontrolu + gecici hatalarda (429/5xx/network) ustel backoff'lu otomatik retry (yeni `common/utils/retry.ts`, `PublisherService`'e baglandi).
- Profil & ajans ayarlari guncelleme: `PATCH /auth/me` (ad, avatar — bos string ile temizlenir) ve `PATCH /auth/agency` (ad, slug, varsayilan timezone; OWNER/ADMIN, slug cakismasinda 409). Timezone schema degisikligi olmadan ajans `settings` JSON'inda saklaniyor; `getMe` artik `agency.timezone` donduruyor. Yeni `UpdateProfileDto` / `UpdateAgencyDto`.

### Changed
- Team sayfasi mock veriden gercek API'ye baglandi: `/team/members` + `/team/invitations` listeleniyor, rol degistirme (`PATCH /team/members/:id/role`), uye cikarma ve davet iptali gercek endpoint'lere bagli; yukleme/hata durumlari ve admin olmayanlar icin davet listesi fallback'i eklendi.

## 2026-06-25

### Added
- Gonderi ekstralari (Facebook & Instagram): konum etiketleme, ilk yorum ve kullanici etiketleme. Yeni paylasilan `PostExtras` bileseni (debounce'lu konum aramasi + dropdown, ilk yorum alani, IG icin chip-tabanli kullanici etiketleme) hem yeni post hem post detay sayfasina eklendi; sadece FB/IG seciliyken gorunur.
- Konum arama endpoint'i: `GET /social-accounts/:id/location-search?q=` — FB Pages place index'ini proxy'ler, `{id, name, address}` dondurur (yalnizca FB/IG hesaplari).
- IG publisher: `location_id` (tek gorsel + carousel), `user_tags` (tek gorselde merkeze konumlanir) ve yayindan sonra ilk yorum (best-effort).
- FB publisher: `place` parametresi (text/tek foto/coklu foto) ve yayindan sonra ilk yorum (best-effort). FB user-tags API kisitli oldugu icin IG'ye ozel tutuldu.
- `PublishContent` arayuzune `location` / `firstComment` / `userTags` alanlari eklendi; `buildContent` bunlari post iceriginden okuyor.

## 2026-06-23 (2)

### Changed
- Comments sayfasi feed/akis duzenine gecti (Instagram/Facebook gibi): postlar dogrudan kart olarak listeleniyor (hesap basligi + gorsel + caption), her postun altinda o posta ait yorumlar inline yanitla/sil/arsivle aksiyonlariyla. Iki-panel/thread yapisi kaldirildi. DM'ler bu sayfada listelenmiyor (Messages sayfasinda). Yorumlar postId'ye gore gruplaniyor, yanitlar parent yoruma nested.

### Fixed
- IG/FB DM yanit: 24 saatlik mesajlasma penceresi kapaliysa otomatik olarak HUMAN_AGENT etiketiyle yeniden deneniyor (pencereyi 7 gune uzatir; app'te Human Agent ozelligi gerekir). Yine de basarisizsa ham JSON yerine net mesaj gosteriliyor ("Yanit penceresi kapandi: ..."). Graph error #10 / subcode 2534022 tespiti eklendi.

## 2026-06-23

### Added
- Yorum silme: inbox adapter'larina `deleteItem` + `canDelete` eklendi (FB/IG destekler; Twitter/LinkedIn/TikTok desteklemez). `DELETE /inbox/:id` endpoint'i `InboxDeleteResult` donduruyor. Frontend'de cop kutusu butonu + onay + partial-failure uyarisi.
- Inbox UI: yorumlar gonderiye gore gruplandi (acilir-kapanir post basliklari, thumbnail + caption), thread'de "post baglam karti" (gorsel + metin + View post linki). Post onizleme verisi (`postPreviewText/ImageUrl/Permalink`) sync sirasinda yakalaniyor — InboxItem'a 3 kolon + migration eklendi.
- LinkedIn post silme (`unpublish`) implement edildi (DELETE /v2/ugcPosts/{urn}).

### Fixed
- Gonderi silme artik platform basina sonuc donduruyor: `DELETE /posts/:id` -> `{ deleted, platformResults }` (204 -> 200). IG/TikTok API silmeyi desteklemedigi icin kullaniciya "yerel silindi ama platformdan silinemedi" uyarisi gosteriliyor (onceden sessizce yutuluyordu).
- DM yanit hatasi: adapter hatasi artik opak 500 yerine 502 + gercek platform mesaji olarak donuyor.
- Facebook baglanma: `pages_messaging` scope'unun zorla enjekte edilmesi kaldirildi (opt-in yapildi) — onaysiz app'lerde "Invalid Scopes: pages_messaging" hatasiyla tum login'i bozuyordu.

## 2026-06-12

### Added
- Auto-sync on connect: yeni bir sosyal hesap baglandiginda postlar + inbox (yorum/DM) + analytics snapshot otomatik senkronize ediliyor (onceden sadece postlar, o da yalnizca Facebook/Instagram icin). Generic OAuth callback'e baglandi → Twitter/LinkedIn/TikTok/YouTube de artik baglanir baglanmaz sync oluyor. `AnalyticsFetcherService.snapshotAccountNow()` eklendi; her adim izole (best-effort, baglantiyi bloke etmiyor).

## 2026-03-21

### Added
- TASK-080: Redis-based rate limiting middleware (token bucket, per-tenant plan limits, per-platform social API limits, endpoint groups, Lua script atomicity)
- TASK-081: Swagger API documentation completed (all 15 controllers + 31 DTOs already had decorators, health endpoint added)
- TASK-084: Production Docker setup (multi-stage Dockerfiles for API + Web, docker-compose.prod.yml with healthchecks, worker service, .dockerignore)
- TASK-087: Landing page with hero, features, pricing, testimonials + onboarding wizard (4-step)

- TASK-082: Unit + integration test suite (87 tests — auth, tenant, client, post, billing) with Vitest + prisma-mock
- TASK-083: E2E test suite (162 tests — landing, auth, dashboard, clients, posts, responsive) with Playwright
- TASK-085: CI/CD pipeline (9 GitHub Actions workflows — CI, deploy staging/prod, code quality, dependencies, auto-release, docs, performance)
- TASK-086: Environment config management (.env.example, Zod validation for API + Web, .env.test)

### Changed
- Next.js standalone output mode enabled for Docker builds
- **PROJECT COMPLETE: 87/87 tasks (100%)**

## 2026-03-17

### Added
- TASK-001: Monorepo initialized (pnpm 10 + Turborepo 2, apps/api, apps/web, packages/*)
- TASK-002: Meta directories created (sp-tasks, sp-docs, sp-config, sp-plans)
- TASK-003: Claude Code hooks, commands, settings configured
- TASK-004: CLAUDE.md master configuration with 87 tasks across 11 phases
- TASK-005: Docker dev environment (PostgreSQL 16, Redis 7, MinIO, MailHog)
- TASK-006: ESLint + Prettier + TypeScript strict config (shared packages)
- TASK-007: Git repo initialized, GitHub remote connected, first push
- Prisma schema with all 25 models (Agency, User, Client, Post, SocialAccount, etc.)
- NestJS API scaffold with health endpoint + Swagger
- Next.js 15 frontend scaffold with App Router
- Shared packages: shared-types (enums), config-eslint, config-ts, prisma, ui
