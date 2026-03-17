# Agent Instructions

## Sub-Agent Types

### Backend Agent
- **Scope**: `apps/api/src/modules/` — API modules, services, controllers, DTOs, guards
- **Validation**: `pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test`
- **Commit Prefix**: `feat(api)`, `fix(api)`, `refactor(api)`

### Frontend Agent
- **Scope**: `apps/web/` — Pages, components, hooks, stores
- **Validation**: `pnpm --filter web typecheck && pnpm --filter web lint`
- **Commit Prefix**: `feat(web)`, `fix(web)`, `refactor(web)`

### Database Agent
- **Scope**: `packages/prisma/` — Prisma schema, migrations, seed data
- **Validation**: `npx prisma generate && npx prisma migrate dev`
- **Commit Prefix**: `feat(db)`, `fix(db)`

### DevOps Agent
- **Scope**: `docker/`, `docker-compose.yml`, `.github/`, `turbo.json`, root configs
- **Commit Prefix**: `chore(docker)`, `chore(ci)`, `chore(config)`

### Docs Agent
- **Scope**: `sp-tasks/`, `sp-docs/`, `sp-config/`, `sp-plans/`, `*.md`
- **Commit Prefix**: `docs(*)`

## Agent Rules

1. Always read task details before starting work
2. Never modify files outside your scope without approval
3. Run validation commands after every change
4. Update task tracking on completion
5. Follow code conventions strictly
6. Keep commits atomic and well-described

---

## Directory Isolation (Social Pro)

| Agent Task | Allowed Directory | Forbidden |
|------------|-------------------|-----------|
| Auth module | `apps/api/src/modules/auth/` | Other `modules/*/` |
| Client module | `apps/api/src/modules/client/` | Other `modules/*/` |
| Post module | `apps/api/src/modules/post/` | Other `modules/*/` |
| Publisher module | `apps/api/src/modules/publisher/` | Other `modules/*/` |
| Billing module | `apps/api/src/modules/billing/` | Other `modules/*/` |
| Analytics module | `apps/api/src/modules/analytics/` | Other `modules/*/` |
| AI module | `apps/api/src/modules/ai/` | Other `modules/*/` |
| Dashboard pages | `apps/web/app/(dashboard)/` | `(auth)/` pages |
| Auth pages | `apps/web/app/(auth)/` | `(dashboard)/` pages |
| Shared UI | `packages/ui/` | `apps/*/` |
| Prisma schema | `packages/prisma/` | `apps/*/` |

## Shared Files (Retry Pattern)

| File | Strategy |
|------|----------|
| `apps/api/src/app.module.ts` | Read → Edit → retry on conflict (max 3) |
| `packages/prisma/schema.prisma` | Only one agent edits at a time |
| `apps/web/app/(dashboard)/layout.tsx` | Read → Edit → retry |
| `packages/shared-types/index.ts` | Read → Edit → retry |
| `package.json` / `pnpm-lock.yaml` | Orchestrator only |

## Parallel Orchestration Rules

```
Independent tasks → run in parallel (different modules/directories)
Dependent tasks   → run sequentially (start after blocker completes)
Shared file edits → agent handles with retry (max 3)
Package install   → orchestrator only
Schema changes    → sequential (one agent at a time)
```

## Orchestrator Responsibilities

**Before launching sub-agents:**
1. Install packages via `pnpm install`
2. Create directory structure (if needed)
3. Check task dependencies — don't start blocked tasks
4. Direct agents to specific module directories

**After sub-agents complete:**
1. Verify `app.module.ts` has all modules registered
2. Run `pnpm typecheck` (monorepo-wide)
3. Update task tracking (task-index.md + dashboard)
4. Report conflicts
