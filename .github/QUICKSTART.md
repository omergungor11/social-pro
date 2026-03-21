# GitHub Actions Quick Start Guide

Get the Social Pro CI/CD pipeline up and running in 10 minutes.

## Step 1: Verify Workflows Are Installed

All workflow files should be in `.github/workflows/`:

```bash
ls -la .github/workflows/
```

You should see:
- `ci.yml` — Continuous Integration pipeline
- `deploy-staging.yml` — Automatic staging deployment
- `deploy-production.yml` — Manual production deployment
- `auto-release.yml` — Automated release creation
- `code-quality.yml` — Code quality checks
- `dependencies.yml` — Dependency update checks
- `docs.yml` — Documentation validation
- `performance.yml` — Performance testing

## Step 2: Create GitHub Environments

### Via GitHub UI (Recommended for first time)

1. Go to your repository on GitHub
2. Settings → Deployments → Environments
3. Click "New environment"
4. Create **staging** environment
   - Name: `staging`
   - Deployment branches: `develop`
   - Required reviewers: (leave empty)
5. Create **production** environment
   - Name: `production`
   - Deployment branches: `main`
   - Required reviewers: (add your team)

**Or via CLI (if using GitHub CLI):**

```bash
# Create staging environment
gh api repos/:owner/:repo/environments \
  -f name='staging' \
  -f deployment_branch_policy='{"protected_branches":false,"custom_branches":true}'

# Create production environment
gh api repos/:owner/:repo/environments \
  -f name='production' \
  -f deployment_branch_policy='{"protected_branches":false,"custom_branches":true}'
```

## Step 3: Add Repository Secrets

Go to Settings → Secrets and variables → Actions:

Add at minimum:
```
SLACK_WEBHOOK_URL = <your-slack-webhook>
```

For testing deployments (optional initial setup):
```
STAGING_API_HOST = staging-api.example.com
STAGING_API_URL = https://staging-api.example.com
STAGING_WEB_URL = https://staging.example.com
STAGING_SSH_KEY = (content of your SSH private key)
STAGING_SSH_USER = deploy
```

## Step 4: Add Environment Secrets

### For Staging Environment

1. Go to Settings → Environments → staging
2. Add secrets:
   - `STAGING_API_HOST`
   - `STAGING_WEB_HOST`
   - `STAGING_API_URL`
   - `STAGING_WEB_URL`
   - `STAGING_SSH_KEY`
   - `STAGING_SSH_USER`

### For Production Environment

1. Go to Settings → Environments → production
2. Add secrets:
   - `PROD_API_HOST`
   - `PROD_WEB_HOST`
   - `PROD_API_URL`
   - `PROD_WEB_URL`
   - `PROD_SSH_KEY`
   - `PROD_SSH_USER`
   - `PROD_DATABASE_URL`

See `.github/ENVIRONMENTS.md` for detailed instructions.

## Step 5: Test the CI Pipeline

1. Create a feature branch:
```bash
git checkout -b test/ci-pipeline
```

2. Make a small change:
```bash
echo "# Test" >> README.md
```

3. Commit and push:
```bash
git add README.md
git commit -m "test: verify CI pipeline"
git push origin test/ci-pipeline
```

4. Go to GitHub Actions tab and watch the workflow run
5. It should:
   - ✓ Run linting
   - ✓ Run type checking
   - ✓ Run tests
   - ✓ Build everything

6. Once passing, create a pull request
7. The workflow should run again on the PR

## Step 6: Test Staging Deployment (Optional)

1. Merge a PR to `develop` branch:
```bash
git checkout develop
git merge test/ci-pipeline
git push origin develop
```

2. Watch GitHub Actions:
   - CI pipeline runs
   - `deploy-staging.yml` workflow triggers automatically
   - You should see deployment steps in logs

3. Check Slack notifications (if configured)

## Step 7: Prepare Production Deployment

To enable production deployments:

1. Go to Settings → Environments → production
2. Add required reviewers (team members who can approve deployments)
3. Add all `PROD_*` secrets

## Step 8: Test Production Deployment

⚠️ **Only do this if you have a staging environment to test with!**

1. Go to Actions tab
2. Select "Deploy Production" workflow
3. Click "Run workflow"
4. Select `main` branch
5. Set `dry_run: true` to test without deploying
6. Click "Run workflow"

Watch the logs to see what would be deployed.

## Verify Everything Works

### CI Pipeline

```bash
# Push to main or develop
git push origin develop

# Watch at: github.com/your-repo/actions
# Should see "CI" workflow running
```

Expected: All checks pass ✓

### Staging Deployment

```bash
# Push to develop (after CI passes)
git push origin develop

# Watch at: github.com/your-repo/actions
# Should see "Deploy Staging" workflow running
```

Expected: Workflow triggers and runs

### Status Badges

Add these to your README.md to show pipeline status:

```markdown
# Social Pro

[![CI](https://github.com/omergungor11/social-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/omergungor11/social-pro/actions/workflows/ci.yml)
[![Code Quality](https://github.com/omergungor11/social-pro/actions/workflows/code-quality.yml/badge.svg)](https://github.com/omergungor11/social-pro/actions/workflows/code-quality.yml)
[![Deploy Staging](https://github.com/omergungor11/social-pro/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/omergungor11/social-pro/actions/workflows/deploy-staging.yml)
```

## Common Issues

### Workflow Not Showing Up

- Wait a few minutes for GitHub to index the files
- Check that workflow files are in `.github/workflows/`
- Verify YAML syntax is valid

### Tests Failing

```bash
# Run locally first
pnpm install
pnpm typecheck
pnpm lint
pnpm test
```

Fix any issues, then push again.

### Secrets Not Available

- Verify secret name matches workflow reference exactly (case-sensitive)
- Check secret is in right location (repo secrets vs environment secrets)
- For environment-specific secrets, verify job has `environment:` set

### Docker Build Failing

- Check Docker image tags are correct
- Verify `GITHUB_TOKEN` has `packages: write` permission
- Check Dockerfile syntax

## Next Steps

1. **Read full documentation:**
   - `.github/workflows/README.md` — Workflow details
   - `.github/ENVIRONMENTS.md` — Environment setup
   - `.github/DEPLOYMENT-STRATEGY.md` — Deployment procedures
   - `.github/TROUBLESHOOTING.md` — Common issues

2. **Customize workflows:**
   - Update Docker image names
   - Modify health check endpoints
   - Add additional tests
   - Configure your team's preferences

3. **Set up monitoring:**
   - Configure Slack notifications
   - Set up GitHub status checks
   - Enable branch protection rules
   - Add required reviewer assignments

4. **Train your team:**
   - Share deployment procedures
   - Document your team's workflow
   - Set up on-call rotation
   - Create incident playbooks

## Support

- 📖 See `.github/TROUBLESHOOTING.md` for common issues
- 🔗 GitHub Actions docs: https://docs.github.com/en/actions
- 💬 Ask in team Slack or create a GitHub Issue
- 📝 Update this guide as you customize the pipeline

## Key Metrics to Track

After setup, monitor these metrics:

- **Deployment Frequency**: How many times per day/week?
- **Lead Time**: From commit to production in minutes
- **MTTR**: Time to recover from failures (target: <30 min)
- **Change Failure Rate**: % of deployments causing incidents (target: <5%)

These are the DORA metrics that indicate DevOps maturity.

---

**Happy deploying!** 🚀
