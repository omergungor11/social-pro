# GitHub Actions CI/CD Pipeline

This directory contains all GitHub Actions workflows for the Social Pro monorepo.

## Workflows Overview

### CI Pipeline (`ci.yml`)

Runs on every push to `main` and `develop` branches, and on pull requests to `main`.

**Jobs:**
- **lint-typecheck**: Lints code and runs TypeScript type checking
- **test-backend**: Runs backend tests with PostgreSQL and Redis services
- **test-frontend**: Builds frontend application
- **build**: Builds all packages and applications
- **docker-build**: Builds and pushes Docker images to GitHub Container Registry (ghcr.io) on main branch

**Artifacts:**
- Build output stored for 1 day (development.yml uses this for deployment)

### Deploy Staging (`deploy-staging.yml`)

Runs on every push to `develop` branch.

**Jobs:**
- **deploy**: Deploys to staging environment with manual deployment commands and health checks

**Required Secrets:**
- `STAGING_API_URL`: Staging API endpoint
- `STAGING_WEB_URL`: Staging web endpoint
- `STAGING_API_HOST`: Staging API host address
- `STAGING_WEB_HOST`: Staging web host address
- `STAGING_SSH_KEY`: SSH private key for staging server
- `STAGING_SSH_USER`: SSH user for staging deployment
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications

### Deploy Production (`deploy-production.yml`)

Runs on manual workflow dispatch from the GitHub UI.

**Jobs:**
- **pre-deployment-checks**: Verifies we're on main branch and gathers commit info
- **security-scan**: Runs Trivy vulnerability scanning and TruffleHog secret detection
- **deploy**: Performs blue-green deployment with health checks and rollback support

**Environment:**
- Requires manual approval via GitHub Environments settings

**Required Secrets:**
- `PROD_API_HOST`: Production API host address
- `PROD_WEB_HOST`: Production web host address
- `PROD_SSH_KEY`: SSH private key for production server
- `PROD_SSH_USER`: SSH user for production deployment
- `PROD_DATABASE_URL`: Production database connection string
- `PROD_API_URL`: Production API endpoint
- `PROD_WEB_URL`: Production web endpoint
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications

### Auto Release (`auto-release.yml`)

Runs when version is bumped in `package.json` on main branch.

**Jobs:**
- **check-version**: Detects version changes
- **create-release**: Creates GitHub Release with auto-generated changelog

### Code Quality (`code-quality.yml`)

Runs on push to main/develop and on pull requests.

**Jobs:**
- **format-check**: Validates code formatting with Prettier
- **complexity-analysis**: Analyzes code complexity
- **dependency-audit**: Audits npm dependencies for vulnerabilities
- **license-check**: Verifies dependency licenses

### Dependencies (`dependencies.yml`)

Runs on schedule (Mondays 2 AM UTC) or on manual dispatch.

**Jobs:**
- **update-dependencies**: Creates PRs with dependency updates

### Documentation (`docs.yml`)

Runs on changes to documentation files on main/develop branches.

**Jobs:**
- **validate-markdown**: Validates markdown formatting and checks for dead links
- **build-docs**: Builds and publishes documentation
- **notify-docs-change**: Sends Slack notification of documentation changes

### Performance (`performance.yml`)

Runs on push to main/develop and on pull requests.

**Jobs:**
- **bundle-analysis**: Analyzes Next.js bundle sizes
- **lighthouse**: Runs Lighthouse performance audits
- **load-testing**: Performs load testing on main branch

## Concurrency & Cancellation

Most workflows use concurrency groups to cancel outdated runs:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

Staging deployments use `cancel-in-progress: false` to prevent interrupting deployments.

## GitHub Environments

Create two environments in GitHub repository settings:

### Staging Environment
- No approval required
- Secrets: `STAGING_*` variables
- Deployment branch: `develop`

### Production Environment
- Requires manual approval by designated reviewers
- Secrets: `PROD_*` variables
- Deployment branch: `main`

## Required Repository Secrets

All secrets must be created in GitHub repository settings (Settings → Secrets and variables → Actions):

### Common Secrets
- `SLACK_WEBHOOK_URL`: Slack webhook for deployment notifications

### Staging Secrets
- `STAGING_API_HOST`
- `STAGING_WEB_HOST`
- `STAGING_API_URL`
- `STAGING_WEB_URL`
- `STAGING_SSH_KEY`
- `STAGING_SSH_USER`

### Production Secrets
- `PROD_API_HOST`
- `PROD_WEB_HOST`
- `PROD_API_URL`
- `PROD_WEB_URL`
- `PROD_SSH_KEY`
- `PROD_SSH_USER`
- `PROD_DATABASE_URL`

## Status Badges

Add these to your README.md:

```markdown
[![CI](https://github.com/omergungor11/social-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/omergungor11/social-pro/actions/workflows/ci.yml)
[![Code Quality](https://github.com/omergungor11/social-pro/actions/workflows/code-quality.yml/badge.svg)](https://github.com/omergungor11/social-pro/actions/workflows/code-quality.yml)
[![Deploy Staging](https://github.com/omergungor11/social-pro/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/omergungor11/social-pro/actions/workflows/deploy-staging.yml)
[![Deploy Production](https://github.com/omergungor11/social-pro/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/omergungor11/social-pro/actions/workflows/deploy-production.yml)
```

## Local Testing

To test workflows locally, use [act](https://github.com/nektos/act):

```bash
# Install act
brew install act

# Run a specific workflow
act -j lint-typecheck

# Run with secrets
act -s SLACK_WEBHOOK_URL=https://... -j build
```

## Customization

### Adding New Jobs to CI

1. Create a new job in `ci.yml`
2. Set `needs: [lint-typecheck]` to run after linting
3. Add artifacts/caching as needed
4. Update documentation

### Adding New Deployment Targets

1. Create `deploy-{environment}.yml` workflow
2. Reference environment secrets with proper naming
3. Add health checks and rollback logic
4. Configure GitHub Environment for approvals

### Updating Docker Image Names

Change image names in `docker-build` job and deployment workflows:

```yaml
images: ghcr.io/${{ github.repository }}/api  # Change 'api' to your image name
```

## Troubleshooting

### Workflow Not Triggering

1. Verify trigger conditions in `on:` section
2. Check branch protection rules
3. Ensure secrets are configured
4. Review GitHub Actions logs

### Build Failures

1. Check workflow logs for specific error messages
2. Run locally with `pnpm install && pnpm build`
3. Verify all environment variables are set
4. Check service health in logs (PostgreSQL, Redis)

### Docker Push Failures

1. Verify `GITHUB_TOKEN` has `packages: write` permission
2. Check repository is public or private access is configured
3. Verify image name format: `ghcr.io/owner/repo/image:tag`

### Deployment Issues

1. Verify SSH keys are correctly configured
2. Check target server connectivity
3. Review deployment scripts in workflow
4. Verify environment-specific secrets exist

## Performance Tips

### Cache Management

- pnpm cache is automatically managed via `setup-pnpm`
- Docker layer cache is preserved across runs
- Build artifacts are cached for 1 day

### Parallel Execution

- Jobs run in parallel unless they have `needs:` dependency
- Use `needs:` to create dependency chains
- Reduces overall pipeline time

### Cost Optimization

- Docker builds only on main branch
- Load tests only on main branch
- Cache aggressive usage to reduce redundant builds

## Security Considerations

1. **Secrets Management**
   - All secrets encrypted by GitHub
   - Never log secrets in output
   - Use environment-specific secrets

2. **Permissions**
   - Use minimal permissions per job
   - `GITHUB_TOKEN` is automatically provided
   - Configure SSH keys only where needed

3. **Docker Registry**
   - Images pushed to ghcr.io with GitHub auth
   - No separate Docker Hub credentials needed
   - Token scoped to repository

4. **Code Scanning**
   - Trivy scans for vulnerabilities
   - TruffleHog checks for leaked secrets
   - Results uploaded to GitHub Security tab

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Turborepo Documentation](https://turbo.build)
- [pnpm Documentation](https://pnpm.io)
- [Docker Documentation](https://docs.docker.com)
