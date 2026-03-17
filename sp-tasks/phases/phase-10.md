# Phase 10: Polish, Testing & Deployment

## TASK-080: Rate Limiting Middleware

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-043

### Acceptance Criteria
- [ ] Redis-based token bucket rate limiter
- [ ] Per-tenant API rate limiting (configurable per plan)
- [ ] Per-platform social API rate limiting (respect each platform's limits)
- [ ] Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- [ ] 429 Too Many Requests response with Retry-After header
- [ ] Different limits for different endpoint groups (auth, publishing, analytics)

---

## TASK-081: API Documentation (Swagger)

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-009

### Acceptance Criteria
- [ ] Swagger UI at `/api/docs`
- [ ] All endpoints documented with request/response schemas
- [ ] Authentication documented (Bearer JWT)
- [ ] DTOs decorated with @ApiProperty
- [ ] Grouped by module/tag
- [ ] Example values for all fields
- [ ] Error responses documented

---

## TASK-082: Unit + Integration Tests

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-010, TASK-041, TASK-066

### Acceptance Criteria
- [ ] Auth module: register, login, refresh, password reset (unit + integration)
- [ ] Tenant module: tenant scoping, role guards (unit)
- [ ] Client module: CRUD, bulk ops (integration)
- [ ] Post module: create, schedule, publish flow (integration)
- [ ] Billing module: subscription lifecycle, usage tracking (unit + integration)
- [ ] Minimum 70% code coverage on core modules
- [ ] Vitest configuration
- [ ] Test database setup (docker-compose.test.yml)
- [ ] CI-compatible (no external dependencies required)

---

## TASK-083: E2E Test Suite

**Agent**: frontend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-014, TASK-048, TASK-034

### Acceptance Criteria
- [ ] Playwright setup + configuration
- [ ] Login flow test
- [ ] Register flow test
- [ ] Create client flow test
- [ ] Connect social account flow (mock OAuth)
- [ ] Create + schedule post flow test
- [ ] AI content generation flow test
- [ ] Billing: plan upgrade flow test
- [ ] Mobile viewport tests (responsive)
- [ ] CI-compatible (headless browser)

---

## TASK-084: Production Docker Setup

**Agent**: devops
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-005

### Acceptance Criteria
- [ ] Multi-stage Dockerfile for API (build + production)
- [ ] Multi-stage Dockerfile for Web (build + standalone Next.js)
- [ ] `docker-compose.prod.yml` — all services
- [ ] Health check endpoints for all containers
- [ ] Non-root user in containers
- [ ] Optimized layer caching
- [ ] Image size < 200MB per service
- [ ] Environment variable injection

---

## TASK-085: CI/CD Pipeline

**Agent**: devops
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-084

### Acceptance Criteria
- [ ] `.github/workflows/ci.yml` — on push/PR to main
- [ ] Steps: checkout → install → typecheck → lint → test → build
- [ ] Turborepo remote caching (optional)
- [ ] Docker build + push to registry
- [ ] Deploy to staging on push to develop
- [ ] Deploy to production on push to main (manual approval)
- [ ] Environment secrets management
- [ ] Status badges in README

---

## TASK-086: Environment Config Management

**Agent**: devops
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-084

### Acceptance Criteria
- [ ] `.env.example` with all required variables (documented)
- [ ] Separate .env files: .env.development, .env.test, .env.production
- [ ] Zod schema for runtime env validation (both API and Web)
- [ ] Documentation: how to get API keys for each social platform
- [ ] Docker secrets integration for production

---

## TASK-087: Landing Page + Onboarding Flow

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-015, TASK-070

### Acceptance Criteria
- [ ] Landing page: hero, features, pricing, testimonials, CTA
- [ ] Responsive design (mobile-first)
- [ ] SEO optimized (meta tags, OG images)
- [ ] Onboarding wizard (after register):
  1. Agency setup (name, logo)
  2. Connect first social account
  3. Create first post (optional)
  4. Invite team (optional)
- [ ] Skip option for each step
- [ ] Progress indicator
