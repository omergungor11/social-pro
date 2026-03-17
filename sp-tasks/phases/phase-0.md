# Phase 0: Project Setup

## TASK-001: Monorepo + Tooling Init

**Agent**: devops
**Complexity**: S
**Status**: PENDING
**Dependencies**: -

### Description
pnpm workspaces + Turborepo ile monorepo yapisini kur.

### Acceptance Criteria
- [ ] `pnpm init` + `pnpm-workspace.yaml` (apps/*, packages/*)
- [ ] `turbo.json` — build, dev, lint, typecheck pipeline'lari
- [ ] Root `package.json` with workspace scripts (dev, build, lint, typecheck, test)
- [ ] `apps/api/` NestJS placeholder package.json
- [ ] `apps/web/` Next.js placeholder package.json
- [ ] `packages/shared-types/` placeholder
- [ ] `packages/prisma/` placeholder
- [ ] `packages/ui/` placeholder
- [ ] `packages/config-eslint/` placeholder
- [ ] `packages/config-ts/` placeholder

---

## TASK-002: Meta Directories

**Agent**: docs
**Complexity**: S
**Status**: PENDING
**Dependencies**: -

### Acceptance Criteria
- [ ] `sp-tasks/` with task-index.md, phases/, active/
- [ ] `sp-docs/` with MEMORY.md, CHANGELOG.md
- [ ] `sp-config/` with workflow.md, conventions.md, tech-stack.md, agent-instructions.md
- [ ] `sp-plans/` directory created

---

## TASK-003: Claude Code Setup

**Agent**: devops
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-001

### Acceptance Criteria
- [ ] `protect-files.sh` hook working + executable
- [ ] 5 slash commands (cold-start, git-full, turn-off, local-testing, new-project)
- [ ] `settings.local.json` with permissions (pnpm, npx, prisma, git, docker)
- [ ] Hook: PostToolUse Prisma auto-generate on schema edit

---

## TASK-004: CLAUDE.md Configuration

**Agent**: docs
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-002

### Acceptance Criteria
- [ ] Project description + workspace layout
- [ ] Slash commands documented
- [ ] Code conventions summarized
- [ ] Reference directories table
- [ ] Hooks documented
- [ ] Temel komutlar (pnpm dev, build, typecheck, lint)

---

## TASK-005: Docker Dev Environment

**Agent**: devops
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-001

### Description
Development ortami icin docker-compose: PostgreSQL 16, Redis 7, MinIO (S3), MailHog.

### Acceptance Criteria
- [ ] `docker-compose.yml` with 4 services
- [ ] PostgreSQL: port 5432, volume mount, health check
- [ ] Redis: port 6379, health check
- [ ] MinIO: port 9000 (API) + 9001 (console), default bucket
- [ ] MailHog: port 1025 (SMTP) + 8025 (UI)
- [ ] `.env.example` with all required environment variables

---

## TASK-006: Lint, Format, TypeScript Config

**Agent**: devops
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-001

### Acceptance Criteria
- [ ] `packages/config-eslint/` — shared ESLint config (strict TS rules, no any)
- [ ] `packages/config-ts/` — base tsconfig (strict: true, noUncheckedIndexedAccess)
- [ ] Prettier config (root `.prettierrc`)
- [ ] Each app/package extends shared configs
- [ ] Root scripts: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`

---

## TASK-007: Git Repo Init + First Commit

**Agent**: devops
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-001..006

### Acceptance Criteria
- [ ] `.gitignore` (node_modules, .env*, dist, .next, .turbo, coverage, *.log, .DS_Store)
- [ ] All Phase 0 files committed
- [ ] Remote repository connected
- [ ] First push successful
