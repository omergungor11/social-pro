# Workflow Rules

## Task Workflow

### Pre-Task
1. Read `sp-tasks/task-index.md` for project status
2. Read phase file (`sp-tasks/phases/phase-X.md`) for task details
3. Check all dependencies are COMPLETED
4. Read task-specific context files
5. Update task status to IN_PROGRESS in task-index.md

### During Task
- Follow acceptance criteria strictly
- Run typecheck + lint after changes
- Keep changes focused on the task scope
- Test manually where applicable

### Post-Task
1. Verify all acceptance criteria
2. Run validation commands
3. Update `sp-tasks/task-index.md` (status + dashboard numbers)
4. Update `sp-docs/CHANGELOG.md`
5. Git commit: `feat(TASK-XXX): title`
6. Check blocked tasks, unblock if ready

## Commit Conventions

```
feat(TASK-XXX): description     # New feature
fix(TASK-XXX): description      # Bug fix
refactor(TASK-XXX): description # Refactoring
docs(TASK-XXX): description     # Documentation
chore(TASK-XXX): description    # Tooling/config
test(TASK-XXX): description     # Tests
```

Always append: `Co-Authored-By: Claude <noreply@anthropic.com>`

## Branch Strategy

- `main` — production-ready code
- `develop` — integration branch
- `feat/TASK-XXX-description` — feature branches

## Validation Commands

```bash
pnpm typecheck                    # TypeScript check (all packages)
pnpm lint                         # ESLint (all packages)
pnpm format:check                 # Prettier check
pnpm test                         # All tests
pnpm build                        # Full build
pnpm --filter api typecheck       # Only API typecheck
pnpm --filter web typecheck       # Only Web typecheck
npx prisma generate               # Regenerate Prisma client
npx prisma migrate dev            # Apply migrations
```

## Phase Dependency Flow

```
Phase 0 (Setup)
  └── Phase 1 (Auth & Tenancy)
       ├── Phase 2 (Clients)
       ├── Phase 3 (Social Accounts)
       │    ├── Phase 4 (Media)
       │    ├── Phase 5 (Posts) ← also depends on Phase 4
       │    │    └── Phase 6 (AI)
       │    └── Phase 7 (Analytics)
       ├── Phase 8 (Billing)
       └── Phase 9 (Notifications)
            └── Phase 10 (Polish & Deploy)
```
