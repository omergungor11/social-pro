# Code Conventions

## TypeScript
- Strict mode always enabled (`"strict": true`)
- No `any` types — use `unknown` + type guards
- Interfaces for object shapes, types for unions/intersections
- Explicit return types on exported functions
- Enums in `shared-types` package, shared between frontend and backend

## File Naming
- `kebab-case` for all files
- Backend: `.service.ts`, `.controller.ts`, `.module.ts`, `.dto.ts`, `.guard.ts`, `.interceptor.ts`
- Frontend: `.tsx` for components, `.ts` for utilities
- Tests: `.spec.ts` colocated with source

## API Design
- RESTful endpoints: `/api/v1/{resource}`
- Consistent pagination: `?page=1&limit=20`
- Response format: `{ data, meta? }`
- Error format: `{ error: { statusCode, code, message, details? } }`
- HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 422, 500

## NestJS Backend
- One module per domain (auth, client, post, billing, etc.)
- DTOs with class-validator for all input
- TenantGuard on all tenant-scoped endpoints
- Services handle business logic, controllers are thin
- Repository pattern via Prisma client
- All queries scoped by `agency_id` (multi-tenant)

## Next.js Frontend
- Server Components by default, `'use client'` only when needed
- TanStack Query for server state, Zustand for UI-only state
- shadcn/ui components, never raw HTML for common patterns
- Route groups: `(auth)` for public, `(dashboard)` for protected
- API calls via a typed fetch wrapper

## Database
- PascalCase model names, camelCase field names
- Every tenant-scoped table has `agency_id` as first FK
- Composite indexes include `agency_id` as leading column
- Soft delete pattern where appropriate (`deleted_at` timestamp)
- Encrypted fields for tokens (AES-256-GCM)
- All timestamps in UTC

## Queue / Background Jobs
- Queue names: `post-publish`, `analytics-fetch`, `media-process`, `ai-generate`, `notification`, `social-sync`, `billing`, `report`
- Jobs are idempotent — safe to retry
- Exponential backoff, max 3 retries
- Failed jobs trigger user notification

## Commit Convention
- `feat(TASK-XXX): description` — New feature
- `fix(TASK-XXX): description` — Bug fix
- `refactor(TASK-XXX): description` — Refactoring
- `docs(TASK-XXX): description` — Documentation
- `chore(TASK-XXX): description` — Tooling/config
- `test(TASK-XXX): description` — Tests
- Always add: `Co-Authored-By: Claude <noreply@anthropic.com>`

## Security
- Never store plain-text tokens — always encrypt
- Never commit .env files
- Validate all input at API boundary (DTOs)
- Rate limit per-tenant and per-platform
- CORS configured per environment
- CSP headers on frontend
