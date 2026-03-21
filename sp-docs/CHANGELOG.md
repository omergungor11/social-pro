# Changelog

## 2026-03-21

### Added
- TASK-080: Redis-based rate limiting middleware (token bucket, per-tenant plan limits, per-platform social API limits, endpoint groups, Lua script atomicity)
- TASK-081: Swagger API documentation completed (all 15 controllers + 31 DTOs already had decorators, health endpoint added)
- TASK-084: Production Docker setup (multi-stage Dockerfiles for API + Web, docker-compose.prod.yml with healthchecks, worker service, .dockerignore)
- TASK-087: Landing page with hero, features, pricing, testimonials + onboarding wizard (4-step)

### Changed
- Next.js standalone output mode enabled for Docker builds

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
