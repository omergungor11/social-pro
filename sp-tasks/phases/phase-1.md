# Phase 1: Auth & Multi-Tenancy

## TASK-008: Prisma Schema — Core Auth Entities

**Agent**: db
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-007

### Description
Core veritabani modellerini olustur: Agency, User, AgencyMember, Invitation.

### Acceptance Criteria
- [ ] `Agency` model: id, name, slug (unique), logo_url, plan_id, stripe_customer_id, stripe_subscription_id, settings (Json), timestamps
- [ ] `User` model: id, email (unique), password_hash, name, avatar_url, email_verified_at, timestamps
- [ ] `AgencyMember` model: id, agency_id, user_id, role (OWNER/ADMIN/EDITOR/VIEWER enum), invited_at, accepted_at, timestamps. Unique(agency_id, user_id)
- [ ] `Invitation` model: id, agency_id, email, role, token (unique), expires_at, accepted_at, timestamps
- [ ] Relations correctly defined
- [ ] Initial migration created and applied
- [ ] `prisma generate` successful

---

## TASK-009: NestJS App Scaffold + Common Module

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-007

### Description
NestJS uygulamasini scaffold'la. Common module: global exception filter, response interceptor, validation pipe, base DTOs.

### Acceptance Criteria
- [ ] `apps/api/` — NestJS app with main.ts, app.module.ts
- [ ] Global ValidationPipe with transform + whitelist
- [ ] Global HttpExceptionFilter — `{ error: { statusCode, code, message } }` format
- [ ] Global ResponseInterceptor — `{ data, meta? }` format
- [ ] BaseDto, PaginationDto, SortDto
- [ ] Health check endpoint: `GET /api/health`
- [ ] CORS configuration
- [ ] Swagger/OpenAPI setup
- [ ] Prisma module (forRoot) — connection + tenant extension

---

## TASK-010: Auth Module

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-009, TASK-008

### Description
Authentication: register, login, JWT access+refresh tokens, password reset.

### Acceptance Criteria
- [ ] `POST /api/v1/auth/register` — create user + agency + owner member
- [ ] `POST /api/v1/auth/login` — email/password → JWT pair
- [ ] `POST /api/v1/auth/refresh` — refresh token rotation
- [ ] `POST /api/v1/auth/logout` — invalidate refresh token
- [ ] `POST /api/v1/auth/forgot-password` — send reset email
- [ ] `POST /api/v1/auth/reset-password` — reset with token
- [ ] `GET /api/v1/auth/me` — current user + active agency
- [ ] JWT payload: `{ userId, agencyId, role }`
- [ ] AuthGuard (JWT validation)
- [ ] Password hashing with bcrypt
- [ ] Refresh tokens stored in DB with expiry

---

## TASK-011: Tenant Module

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-009, TASK-008

### Description
Multi-tenant altyapi: TenantGuard, TenantMiddleware, Prisma client extension.

### Acceptance Criteria
- [ ] `TenantMiddleware` — JWT'den agency_id cikart, AsyncLocalStorage'a koy
- [ ] `TenantGuard` — user'in istenen agency'ye ait oldugunu dogrula
- [ ] Prisma Client Extension — tum query'lere `agency_id` WHERE filtresi ekle
- [ ] `@TenantScoped()` decorator — method-level guvenlik
- [ ] `@CurrentAgency()` param decorator — controller'da agency_id al
- [ ] `@CurrentUser()` param decorator — controller'da user bilgisi al
- [ ] `@Roles()` decorator + RolesGuard — role-based access control

---

## TASK-012: Team Module

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-011, TASK-010

### Acceptance Criteria
- [ ] `GET /api/v1/team/members` — list agency members
- [ ] `POST /api/v1/team/invite` — send invitation email
- [ ] `PATCH /api/v1/team/members/:id/role` — change member role
- [ ] `DELETE /api/v1/team/members/:id` — remove member
- [ ] `POST /api/v1/team/invitations/:token/accept` — accept invite
- [ ] Invitation email with accept link
- [ ] Role hierarchy: OWNER > ADMIN > EDITOR > VIEWER

---

## TASK-013: Next.js App Scaffold + Auth.js

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-007

### Acceptance Criteria
- [ ] `apps/web/` — Next.js 15 App Router
- [ ] Auth.js v5 integration (credentials provider + JWT)
- [ ] Middleware: protected routes redirect to login
- [ ] Route groups: `(auth)` public, `(dashboard)` protected
- [ ] Typed API client (fetch wrapper with auth headers)
- [ ] Tailwind CSS 4 + shadcn/ui initialized
- [ ] `packages/ui/` — shadcn/ui components shared package

---

## TASK-014: Login/Register/Forgot-Password Pages

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-013, TASK-010

### Acceptance Criteria
- [ ] Login page: email + password form, error handling, redirect to dashboard
- [ ] Register page: name + email + password + agency name, success → login
- [ ] Forgot password page: email form → confirmation message
- [ ] Reset password page: new password form (token from URL)
- [ ] Form validation with Zod + React Hook Form
- [ ] Loading states, error toasts
- [ ] Responsive design (mobile-first)

---

## TASK-015: Dashboard Layout Shell

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-013, TASK-011

### Description
Ana dashboard layout: sidebar navigation, header, tenant context provider.

### Acceptance Criteria
- [ ] Sidebar: logo, navigation links (Dashboard, Posts, Clients, Social Accounts, Analytics, AI, Team, Billing, Settings)
- [ ] Header: user avatar, notification bell, agency switcher dropdown
- [ ] Mobile responsive: hamburger menu → drawer
- [ ] TenantProvider context (current agency data)
- [ ] Breadcrumb component
- [ ] Dashboard home page: welcome message + quick stats placeholder

---

## TASK-016: Team Management Page

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-015, TASK-012

### Acceptance Criteria
- [ ] Members list: name, email, role, joined date, actions
- [ ] Invite dialog: email + role selection
- [ ] Change role dropdown (ADMIN/EDITOR/VIEWER)
- [ ] Remove member with confirmation
- [ ] Pending invitations list
- [ ] Role-based UI (only OWNER/ADMIN can manage)

---

## TASK-017: Agency Settings Page

**Agent**: frontend
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-015, TASK-011

### Acceptance Criteria
- [ ] Agency name, slug, logo upload
- [ ] Timezone selection
- [ ] Default settings (JSONB editor or structured form)
- [ ] Save + success feedback
