# GitHub Actions Troubleshooting Guide

Common issues and solutions for Social Pro's CI/CD pipeline.

## CI Pipeline Issues

### Lint Failures

**Error**: `ESLint error` or `Prettier format error`

**Solution**:
```bash
# Fix formatting locally
pnpm format:fix

# Fix ESLint issues
pnpm lint:fix

# Commit and push
git add .
git commit -m "fix: code formatting and lint issues"
git push
```

### Typecheck Failures

**Error**: `TS: Type '...' is not assignable to type '...'`

**Solution**:
1. Run locally: `pnpm typecheck`
2. Review TypeScript error message
3. Fix type issues in code
4. Verify with: `pnpm typecheck`
5. Commit and push

**Common fixes**:
```typescript
// Add explicit types
const value: string = getValue();

// Use proper return types
function getData(): Promise<Data> {
  return fetch('/api/data').then(r => r.json());
}

// Import types correctly
import type { User } from '@social-pro/shared-types';
```

### Backend Test Failures

**Error**: `Test failed: PostgreSQL connection timeout`

**Solution**:

Check service health in GitHub Actions logs:
```bash
# If using local docker-compose
docker compose up -d postgres redis
docker compose exec postgres pg_isready
docker compose exec redis redis-cli ping
```

**Common causes**:
- PostgreSQL service slow to start (add more time in health check)
- Redis port conflict
- Database already in use

**Fix**:
```yaml
# Increase health check timeout
services:
  postgres:
    healthcheck:
      timeout: 10s  # was 5s
      retries: 10   # was 5
```

### Frontend Build Failures

**Error**: `next build` failed

**Solution**:

1. Check Node version: `node --version` (should be 22)
2. Check pnpm version: `pnpm --version` (should be 9)
3. Clear build cache:
   ```bash
   pnpm clean
   rm -rf .next node_modules
   pnpm install
   pnpm build
   ```

**Common causes**:
- Missing environment variables
- Incorrect TypeScript configuration
- Invalid JSX syntax

## Docker Build Issues

### Docker Push Fails

**Error**: `error getting credentials - err: exec: "docker-credential-..."`

**Solution**:

This error occurs when GitHub Actions can't authenticate to ghcr.io.

1. Verify `login-action` step exists:
```yaml
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

2. Verify GitHub token has `packages: write` permission
3. Check repository settings:
   - Go to Settings → Actions → General
   - Verify "Read and write permissions" is enabled

### Docker Build Timeout

**Error**: `Context deadline exceeded` or `Build cancelled`

**Solution**:

Increase build timeout:
```yaml
- uses: docker/build-push-action@v5
  timeout-minutes: 30  # Increase from default 20
```

Check what's slow:
- Large node_modules?
- Many dependencies?
- Slow network during install?

**Optimization**:
```dockerfile
# Use layer caching effectively
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# Cache dependencies layer
FROM base AS deps
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build layer
FROM deps AS build
COPY . .
RUN pnpm build
```

### Image Size Too Large

**Error**: `Layers too large` or push very slow

**Solution**:

1. Optimize Dockerfile:
```dockerfile
# Multi-stage build
FROM ... AS build
# Build steps here
RUN pnpm build

# Final stage - only copy artifacts
FROM base
COPY --from=build /app/dist ./dist
```

2. Use .dockerignore:
```
node_modules
.git
.next/cache
.eslintcache
dist
```

3. Check image size:
```bash
docker images ghcr.io/owner/social-pro/api
```

## Deployment Issues

### Staging Deployment Fails

**Error**: `Health check failed` or `SSH connection refused`

**Solution**:

**SSH Connection Issues**:
1. Verify SSH key is correct:
   ```bash
   # Check public key matches on server
   cat ~/.ssh/authorized_keys | grep github-actions
   ```

2. Test connection locally:
   ```bash
   ssh -i deploy_key -v deploy@staging.example.com "echo ok"
   ```

3. Check firewall:
   - Verify port 22 open
   - Check security groups allow GitHub runner IPs

**Health Check Failure**:
1. SSH to staging and check services:
   ```bash
   ssh deploy@staging.example.com
   docker ps
   docker logs sp-api
   curl http://localhost:4000/api/v1/health
   ```

2. Check logs for errors:
   ```bash
   docker logs sp-api | tail -50
   docker logs sp-web | tail -50
   ```

3. Verify environment variables:
   ```bash
   docker inspect sp-api | grep -A 20 "Env"
   ```

### Production Deployment Blocked by Approval

**Error**: `Workflow waiting for approval` (stuck for hours)

**Solution**:

1. Check if reviewer has access:
   - Go to Settings → Environments → production
   - Verify reviewer is listed under "Required reviewers"

2. Check if current user can approve:
   - Need to be in reviewer list
   - Or be repository owner

3. Manually approve:
   - Go to Actions tab
   - Find pending workflow
   - Click "Review deployments"
   - Select and approve

### Production Deployment Security Scan Fails

**Error**: `Trivy found vulnerabilities` or `TruffleHog detected secret`

**Solution**:

**For Vulnerability**:
1. Check what was found:
   - Review GitHub Security tab
   - Check SARIF upload details

2. Update vulnerable dependency:
   ```bash
   pnpm update package-name@latest
   pnpm audit
   ```

3. If can't update, note exception:
   - Document why exception needed
   - Add to .trivyignore (if using Trivy)

**For Secret Detection**:
1. Check what was detected:
   - Review TruffleHog output
   - Determine if real secret or false positive

2. If real secret exposed:
   ```bash
   # 1. Rotate the credential immediately
   # 2. Remove from history
   git log --full-history -p -- path/to/file | grep -i password
   # 3. Force push (only if team agrees)
   ```

3. If false positive:
   - Add pattern to .trufflehogignore
   - Comment explaining why it's safe

### Deployment Creates Wrong Image Tag

**Error**: Image tagged as `latest` instead of version tag

**Solution**:

Check metadata action in workflow:
```yaml
- uses: docker/metadata-action@v5
  id: meta-api
  with:
    images: ghcr.io/${{ github.repository }}/api
    tags: |
      type=ref,event=branch
      type=semver,pattern={{version}}
      type=sha
```

Verify git tags exist:
```bash
git tag
git describe --tags
```

Create proper version tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Workflow Execution Issues

### Workflow Not Triggering

**Problem**: Workflow should have run but didn't

**Diagnostic**:
1. Check `on:` trigger conditions in workflow file
2. Verify branch name matches
3. Check if branch is protected
4. Look for disabled workflows

**Solution**:

Check GitHub Actions settings:
1. Settings → Actions → General
2. Verify "Actions permissions" is "Allow all actions and reusable workflows"
3. Check "Workflow permissions" includes needed permissions

Enable workflow if disabled:
```bash
git show refs/heads/<branch>:path/to/workflow.yml | grep "^on:"
```

### Workflow Timeout

**Error**: `The operation timed out`

**Solution**:

Check workflow step timeout settings:
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 60  # Default is 360 (6 hours)
    steps:
      - name: Long running step
        timeout-minutes: 30  # Can also set per step
        run: npm run build
```

Optimize long-running steps:
- Use caching more aggressively
- Run jobs in parallel
- Break into smaller jobs

### Out of Disk Space

**Error**: `No space left on device`

**Solution**:

Clean up in workflow:
```yaml
- name: Free up disk space
  run: |
    sudo rm -rf /usr/share/dotnet
    sudo rm -rf /usr/local/lib/android
    sudo rm -rf /opt/ghc
    sudo apt-get clean
```

Or use action:
```yaml
- uses: jlumbroso/free-up-space-action@v1.10
  with:
    android: false
    dotnet: false
    large-packages: true
```

## Cache Issues

### Cache Not Being Used

**Problem**: Workflow rebuilds everything each run (slow)

**Solution**:

Verify cache key is stable:
```yaml
- uses: actions/cache@v4
  with:
    path: ~/.pnpm-store
    # This key should be same for same lockfile
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

Check if cache was saved:
1. Go to Actions → workflow run
2. Expand workflow job
3. Look for "Save cache" step
4. Check cache size

Troubleshoot:
```bash
# Verify cache key on local machine
echo "${{ runner.os }}-pnpm-$(sha256sum pnpm-lock.yaml | cut -d' ' -f1)"
```

### Cache Size Exceeds Limit

**Error**: `Cache size too large` (>5GB)

**Solution**:

Reduce cache:
```yaml
- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    # Limit to latest 5 caches
```

Or clean cache manually:
```bash
# In GitHub UI: Settings → Actions → Caches
# Or via CLI (if available)
gh actions-cache delete <cache-key> -R owner/repo
```

## Secrets & Environment Issues

### Secret Not Available in Workflow

**Error**: Variable is `undefined` or empty string

**Solution**:

Verify secret exists:
```bash
# In GitHub UI: Settings → Secrets and variables → Actions
# Should see secret listed
```

Check secret is referenced correctly:
```yaml
env:
  MY_SECRET: ${{ secrets.MY_SECRET }}
  # NOT ${{ secrets.my_secret }} (case-sensitive!)
```

For environment secrets, verify job has environment set:
```yaml
jobs:
  deploy:
    environment: staging  # Must be set to access env secrets
    steps:
      - run: echo ${{ secrets.STAGING_API_HOST }}
```

### Secret Exposed in Logs

**Alert**: Spotted secret in workflow logs!

**Immediate Action**:
1. Rotate the secret immediately
2. Create new secret value
3. Update in GitHub secrets
4. Monitor for misuse

**Prevent Future**:
- GitHub masks common secret patterns
- For custom secrets, add to `.env.local` and `.gitignore`
- Use `::add-mask::` in workflow

```yaml
- name: Mask sensitive output
  run: |
    echo "::add-mask::${{ secrets.DATABASE_URL }}"
```

## Performance Issues

### Workflow Runs Slow

**Problem**: Takes much longer than expected

**Profile**:
1. Check GitHub Actions logs for slow steps
2. Look for:
   - Installing dependencies takes long
   - Build step is slow
   - Tests take too long

**Optimize**:

Use Turborepo caching:
```yaml
- uses: actions/cache@v4
  with:
    path: node_modules/.cache/turbo
    key: ${{ runner.os }}-turbo-${{ hashFiles('**/pnpm-lock.yaml') }}
```

Use matrix for parallel jobs:
```yaml
jobs:
  test:
    strategy:
      matrix:
        package: [api, web, ui]
    steps:
      - run: pnpm --filter ${{ matrix.package }} test
```

### Expensive Resource Usage

**Problem**: GitHub Actions usage is high (fast hitting quota)

**Check**:
1. Settings → Billing and plans
2. Check Actions usage minutes
3. Identify expensive workflows

**Optimize**:
- Run workflows only on main, not on every branch
- Use caching to reduce rebuild frequency
- Cancel outdated runs with concurrency
- Use scheduled workflows instead of on-push

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # Cancel previous runs
```

## Getting Help

### Check Logs

Always start by checking detailed logs:
1. Go to Actions tab
2. Click failing workflow
3. Expand job that failed
4. Expand step for more details
5. Look for error messages

### Common Log Locations

- **Workflow runs**: GitHub Actions tab → Workflow → Run details
- **Deployment logs**: GitHub Deployments tab
- **Container logs**: SSH to server → `docker logs container_name`
- **Application logs**: Server `/var/log/` directory

### Debug Mode

Enable GitHub Actions debug logging:
1. Settings → Secrets → New secret
2. Name: `ACTIONS_STEP_DEBUG`
3. Value: `true`
4. Rerun workflow

This shows more verbose output in logs.

### Get Support

1. Check existing issues: https://github.com/omergungor11/social-pro/issues
2. Review workflow files for typos
3. Test steps locally if possible
4. Ask team members for help
5. Check GitHub Community Discussions
