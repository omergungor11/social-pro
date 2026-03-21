# GitHub Actions CI/CD Pipeline for Social Pro

Complete production-ready CI/CD pipeline implementation for the Social Pro monorepo.

## Quick Navigation

| Document | Purpose |
|----------|---------|
| **[QUICKSTART.md](./QUICKSTART.md)** | Get started in 10 minutes ✓ **Start here** |
| **[ENVIRONMENTS.md](./ENVIRONMENTS.md)** | Configure GitHub Environments and secrets |
| **[DEPLOYMENT-STRATEGY.md](./DEPLOYMENT-STRATEGY.md)** | Understand deployment procedures |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Debug common issues |
| **[IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)** | Complete feature overview |
| **[workflows/README.md](./workflows/README.md)** | Detailed workflow documentation |

## One-Minute Overview

Social Pro has 8 automated GitHub Actions workflows:

### Build & Test
- **CI Pipeline** (`ci.yml`): Lint, test, build on every push
  - Runs linting and type checking
  - Runs backend tests with PostgreSQL + Redis
  - Builds frontend with Next.js
  - Builds Docker images for API and Web

### Deploy
- **Staging** (`deploy-staging.yml`): Automatic deployment to staging on develop
- **Production** (`deploy-production.yml`): Manual deployment with approval gate

### Release Management
- **Auto Release** (`auto-release.yml`): Creates releases when version bumps

### Code Quality
- **Code Quality** (`code-quality.yml`): Format, complexity, dependency audits
- **Dependencies** (`dependencies.yml`): Weekly dependency update PRs
- **Documentation** (`docs.yml`): Validates markdown and publishes docs
- **Performance** (`performance.yml`): Bundle analysis, Lighthouse audits

## Architecture

```
GitHub Push/PR
     ↓
CI Pipeline (lint, test, build)
     ↓
    ├─→ Staging (automatic on develop)
    │    └─→ Health checks
    │    └─→ Slack notification
    │
    └─→ Production (manual on main)
         └─→ Pre-deployment security scan
         └─→ Approval required
         └─→ Blue-green deployment
         └─→ Automatic rollback on failure
         └─→ Slack notification
```

## Current Status

- ✓ 8 workflows implemented
- ✓ Complete documentation
- ✓ Ready for configuration
- ⏳ Awaiting GitHub environment setup
- ⏳ Awaiting secret configuration

## Getting Started (5 minutes)

### 1. Read the Quick Start
```bash
# Open in your favorite editor
.github/QUICKSTART.md
```

### 2. Create GitHub Environments
1. Go to repository Settings
2. Deployments → Environments
3. Create `staging` and `production` environments

### 3. Add Secrets
1. Go to Settings → Secrets and variables → Actions
2. Add `SLACK_WEBHOOK_URL` (for notifications)

### 4. Test the Pipeline
1. Create a branch and make a change
2. Push and watch GitHub Actions run
3. Check that lint, tests, and build pass

See [QUICKSTART.md](./QUICKSTART.md) for detailed steps.

## Deployment Flow

### Staging (Automatic)
```
git push origin develop
  ↓
CI Pipeline runs
  ↓
Tests pass ✓
  ↓
Auto-deploy to staging
  ↓
Health checks
  ↓
Slack notification
```

### Production (Manual)
```
Click "Run workflow" on main branch
  ↓
Security scanning
  ↓
Awaiting approval
  ↓
Reviewer approves
  ↓
Blue-green deployment
  ↓
Health checks
  ↓
Automatic rollback if failed
  ↓
Slack notification
```

## Key Features

### Continuous Integration
- Lint checking with ESLint
- Type checking with TypeScript
- Backend testing with Vitest (PostgreSQL + Redis)
- Frontend building with Next.js
- Docker image building and pushing

### Secure Deployments
- GitHub Environments with approval gates
- Security scanning (Trivy + TruffleHog)
- Secret management and masking
- SSH-based deployment (no plaintext credentials)
- Audit trail via GitHub Deployments API

### Zero-Downtime Deployments
- Blue-green deployment pattern
- Health check validation
- Automatic rollback on failure
- Database migration support
- Traffic switching coordination

### Monitoring & Alerts
- Slack notifications for all events
- Health check endpoints
- Deployment tracking
- Error rate monitoring
- Performance metrics

## Files Created

### Workflows (8 files)
```
.github/workflows/
  ├─ ci.yml                  # Main CI pipeline
  ├─ deploy-staging.yml      # Automatic staging deployment
  ├─ deploy-production.yml   # Manual production deployment
  ├─ auto-release.yml        # Automated releases
  ├─ code-quality.yml        # Code quality checks
  ├─ dependencies.yml        # Weekly dependency updates
  ├─ docs.yml               # Documentation validation
  ├─ performance.yml        # Performance testing
  └─ README.md              # Workflow documentation
```

### Documentation (5 files)
```
.github/
  ├─ README.md                    # This file
  ├─ QUICKSTART.md               # 10-minute setup guide
  ├─ ENVIRONMENTS.md              # Environment configuration
  ├─ DEPLOYMENT-STRATEGY.md       # Deployment procedures
  ├─ TROUBLESHOOTING.md          # Common issues & fixes
  └─ IMPLEMENTATION-SUMMARY.md    # Complete overview
```

## Configuration Checklist

- [ ] Read [QUICKSTART.md](./QUICKSTART.md)
- [ ] Create GitHub Environments (staging + production)
- [ ] Add repository secrets:
  - [ ] `SLACK_WEBHOOK_URL` (optional but recommended)
- [ ] Add staging environment secrets:
  - [ ] `STAGING_API_HOST`, `STAGING_API_URL`
  - [ ] `STAGING_WEB_HOST`, `STAGING_WEB_URL`
  - [ ] `STAGING_SSH_KEY`, `STAGING_SSH_USER`
- [ ] Add production environment secrets:
  - [ ] `PROD_API_HOST`, `PROD_API_URL`
  - [ ] `PROD_WEB_HOST`, `PROD_WEB_URL`
  - [ ] `PROD_SSH_KEY`, `PROD_SSH_USER`
  - [ ] `PROD_DATABASE_URL`
- [ ] Test CI pipeline (create PR)
- [ ] Test staging deployment (push to develop)
- [ ] Verify Slack notifications
- [ ] Document team's deployment process
- [ ] Train team on workflow

## Common Tasks

### Run Tests Locally
```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm --filter api test

# Run with coverage
pnpm --filter api test:cov
```

### Build Locally
```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter web build
```

### Test Workflow Locally
```bash
# Install act
brew install act

# Run specific job
act -j lint-typecheck

# Run with secrets
act -s SLACK_WEBHOOK_URL=https://... push
```

### Trigger Production Deployment
1. Go to Actions tab
2. Select "Deploy Production" workflow
3. Click "Run workflow"
4. Select `main` branch
5. Leave `dry_run: false` for actual deployment
6. Monitor the logs

## Deployment Metrics Target

Track these DORA metrics:

| Metric | Target | How to Track |
|--------|--------|--------------|
| Deployment Frequency | > 10/day | Count daily production deployments |
| Lead Time | < 1 hour | Track commit → deploy time |
| MTTR | < 30 min | Track incident → fix deployed |
| Change Failure Rate | < 5% | Count failed deployments |

## Technology Stack

- **CI Platform**: GitHub Actions (native)
- **Package Manager**: pnpm 9
- **Monorepo**: Turborepo 2
- **Backend**: NestJS 11
- **Frontend**: Next.js 15
- **Testing**: Vitest 3
- **Container Registry**: GitHub Container Registry (ghcr.io)
- **Databases**: PostgreSQL 16, Redis 7 (for testing)
- **Security**: Trivy, TruffleHog

## Customization

Each workflow can be customized:

### Change Docker Image Names
Edit `docker-build` job in `ci.yml`

### Modify Health Check Endpoints
Edit health check steps in `deploy-*.yml`

### Add Custom Tests
Add to relevant job in `code-quality.yml`

### Disable Workflows
Delete or comment out workflow files

See [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) for detailed customization guide.

## Troubleshooting

### Workflows Not Showing Up
- Wait a few minutes for GitHub to index
- Verify files are in `.github/workflows/`
- Check YAML syntax

### Tests Failing
```bash
# Run locally first
pnpm test

# Fix issues, then push again
```

### Secrets Not Working
- Verify secret name matches (case-sensitive)
- Check secret is in correct environment
- Ensure job has `environment:` set

### Deployment Issues
See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions.

## Support

- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md)
- **Setup Help**: [ENVIRONMENTS.md](./ENVIRONMENTS.md)
- **Deployment Guide**: [DEPLOYMENT-STRATEGY.md](./DEPLOYMENT-STRATEGY.md)
- **Issues**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Details**: [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)
- **Workflow Info**: [workflows/README.md](./workflows/README.md)

## Status Badges

Add to root `README.md`:

```markdown
# Social Pro

[![CI](https://github.com/omergungor11/social-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/omergungor11/social-pro/actions/workflows/ci.yml)
[![Code Quality](https://github.com/omergungor11/social-pro/actions/workflows/code-quality.yml/badge.svg)](https://github.com/omergungor11/social-pro/actions/workflows/code-quality.yml)
[![Deploy Staging](https://github.com/omergungor11/social-pro/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/omergungor11/social-pro/actions/workflows/deploy-staging.yml)
```

## Next Steps

1. **Immediate** (5 min): Read [QUICKSTART.md](./QUICKSTART.md)
2. **Configure** (15 min): Set up GitHub Environments and secrets
3. **Test** (30 min): Verify CI pipeline works
4. **Deploy** (1 hour): Configure staging and test deployment
5. **Document** (ongoing): Update team's deployment procedures

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Turborepo](https://turbo.build/)
- [pnpm](https://pnpm.io/)
- [NestJS](https://nestjs.com/)
- [Next.js](https://nextjs.org/)

## Implementation Details

- **Created**: March 21, 2026
- **Task**: TASK-085
- **Workflows**: 8 files
- **Documentation**: 6 files
- **Status**: Ready for configuration

---

**Next**: Read [QUICKSTART.md](./QUICKSTART.md) to get started!
