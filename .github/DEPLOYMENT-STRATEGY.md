# Deployment Strategy Guide

This document outlines the deployment strategies and procedures for Social Pro.

## Overview

Social Pro uses a multi-stage deployment pipeline:

1. **Development**: Local testing and feature development
2. **Staging**: Integration testing and pre-production validation
3. **Production**: Live environment with zero-downtime deployments

## Deployment Flow

```
┌─────────────┐
│   Push PR   │
└──────┬──────┘
       │
       v
┌──────────────────────────────────┐
│  CI Pipeline (lint, test, build) │
└──────────┬───────────────────────┘
           │
           v
    ┌──────────────┐
    │  Merge to    │
    │  develop     │
    └──────┬───────┘
           │
           v
┌──────────────────────────────────┐
│   Deploy to Staging (automatic)  │
│  - Build Docker images           │
│  - Run migrations                │
│  - Deploy containers             │
│  - Health checks                 │
│  - Smoke tests                   │
└──────────┬───────────────────────┘
           │
           v
    ┌──────────────┐
    │  Merge to    │
    │  main        │
    └──────┬───────┘
           │
           v
┌──────────────────────────────────┐
│  Manual Deploy to Production     │
│  (requires GitHub approval)      │
│  - Pre-deployment security scan  │
│  - Blue-green deployment         │
│  - Database migrations           │
│  - Health checks                 │
│  - Rollback if needed            │
└──────────────────────────────────┘
```

## Staging Deployment

### Trigger

- Automatic on push to `develop` branch
- No manual approval required
- Runs immediately after CI passes

### Process

1. **Build Artifacts**
   - Compile TypeScript
   - Bundle Next.js app
   - Generate Docker images

2. **Push Images**
   - Push to ghcr.io with `develop` tag
   - Layer caching used for speed

3. **Deploy**
   - Pull latest images on staging server
   - Stop old containers
   - Start new containers with new images
   - Run health checks

4. **Verification**
   - HTTP health check on API endpoint
   - HTTP health check on web endpoint
   - Slack notification of success/failure

### Rollback (Manual)

If staging deployment fails or introduces bugs:

```bash
# SSH to staging server
ssh deploy@staging.example.com

# Redeploy previous image
docker pull ghcr.io/owner/social-pro/api:develop-prev
docker compose -f docker-compose.prod.yml down api
docker compose -f docker-compose.prod.yml up -d api

# Verify health
curl http://localhost:4000/api/v1/health
```

## Production Deployment

### Trigger

- Manual workflow dispatch from GitHub UI
- Available only from `main` branch
- Requires GitHub environment approval

### Pre-Deployment Checks

1. **Verify Main Branch**
   - Ensures deployment is from stable branch

2. **Security Scanning**
   - Trivy: Scans for vulnerabilities in dependencies
   - TruffleHog: Checks for leaked secrets

3. **Approval Required**
   - Configured reviewers must approve
   - Approval recorded in GitHub audit log

### Deployment Strategy: Blue-Green

Social Pro uses blue-green deployment for zero-downtime updates:

```
Before:
┌──────────────┐
│   Load       │ ──► Blue   (v1.0.0)
│  Balancer    │     ✓ Active
└──────────────┘
```

```
During (Deployment):
┌──────────────┐
│   Load       │ ──► Blue   (v1.0.0)
│  Balancer    │     ✓ Active
└──────────────┘
│   (preparing)
    ──► Green  (v1.1.0)
        ✗ Staging
```

```
After (Traffic Switch):
┌──────────────┐
│   Load       │ ──► Green  (v1.1.0)
│  Balancer    │     ✓ Active (NEW)
└──────────────┘
│   (old)
    ──► Blue   (v1.0.0)
        ✗ Ready for rollback
```

### Deployment Steps

1. **Prepare Green Environment**
   ```bash
   # Start new containers with new image
   docker pull ghcr.io/owner/social-pro/api:main
   docker-compose -f docker-compose.prod.yml up -d --no-deps api-green worker-green
   ```

2. **Run Migrations (if needed)**
   ```bash
   docker exec sp-api-green npm run db:migrate:deploy
   ```

3. **Health Checks**
   ```bash
   # Wait for green environment to be healthy
   for i in {1..60}; do
     curl -f http://localhost:4001/api/v1/health && break
     sleep 5
   done
   ```

4. **Switch Traffic**
   ```bash
   # Update load balancer/reverse proxy to point to green
   # Update Docker Compose environment variables
   # Restart with new environment
   docker-compose -f docker-compose.prod.yml up -d api worker
   ```

5. **Verify**
   ```bash
   # Test new environment
   curl https://api.example.com/api/v1/health

   # Run smoke tests
   ./scripts/smoke-test.sh https://api.example.com
   ```

6. **Cleanup (after 24 hours)**
   ```bash
   # Remove old containers
   docker-compose -f docker-compose.prod.yml rm blue
   ```

### Automatic Rollback

Deployment triggers automatic rollback if:

1. **Health Checks Fail**
   - API health endpoint returns non-200 status
   - Web endpoint returns non-200 status
   - Timeouts on health check endpoints

2. **Manual Abort**
   - GitHub workflow cancelled
   - Reviewer initiates rollback request

### Manual Rollback Procedure

If something goes wrong post-deployment:

1. **Check Current Status**
   ```bash
   ssh deploy@prod.example.com
   docker ps | grep social-pro
   ```

2. **Verify Old Version Ready**
   ```bash
   docker ps -a | grep social-pro-v1.0.0
   ```

3. **Switch Back**
   ```bash
   # Stop problematic version
   docker-compose -f docker-compose.prod.yml down api worker

   # Start previous version
   docker run -d --name sp-api-blue ... ghcr.io/owner/social-pro/api:v1.0.0

   # Update load balancer
   # Restart services with old environment
   docker-compose -f docker-compose.prod.yml up -d api worker
   ```

4. **Verify Rollback**
   ```bash
   curl https://api.example.com/api/v1/health
   ```

5. **Notify Team**
   ```bash
   # Post incident in Slack
   # Create incident ticket
   # Schedule post-mortem
   ```

## Canary Deployment (Optional)

For gradual rollout to subset of users:

1. **Deploy to Canary**
   - Deploy new version to subset of servers (10-20%)
   - Monitor metrics and errors

2. **Gradual Rollout**
   - Increase traffic percentage over time
   - Monitor for anomalies

3. **Full Rollout or Rollback**
   - If metrics good: complete rollout
   - If issues detected: rollback

## Database Migrations

### Backward Compatible Migrations

Always write backward-compatible migrations:

```typescript
// Good: Add column with default
ALTER TABLE users ADD COLUMN new_field VARCHAR(255) DEFAULT '';

// Bad: Remove column (breaks old code)
ALTER TABLE users DROP COLUMN old_field;
```

### Migration Process

1. **Before Deployment**
   ```bash
   # Run migrations on staging
   npx prisma migrate deploy --env staging

   # Verify data integrity
   SELECT COUNT(*) FROM users;
   ```

2. **During Deployment**
   ```bash
   # Migrations run before new code
   npx prisma migrate deploy --env production

   # Then deploy new application version
   ```

3. **After Deployment**
   ```bash
   # Verify migration results
   SELECT * FROM users LIMIT 1;
   ```

### Rollback Migrations

If migration fails:

1. **Stop Deployment**
   - Cancel workflow or manual deployment
   - Use backup database if needed

2. **Investigate**
   ```bash
   # Check migration status
   npx prisma migrate status

   # View migration logs
   tail -f /var/log/postgres/postgresql.log
   ```

3. **Fix**
   - Create hotfix migration if needed
   - Deploy new migration
   - Verify data consistency

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Availability**
   - API uptime (target: 99.9%)
   - Web uptime (target: 99.9%)

2. **Performance**
   - API response time (target: <500ms p95)
   - Web page load time (target: <3s p95)
   - Database query time (target: <100ms p95)

3. **Errors**
   - Error rate (target: <0.1%)
   - 5xx errors (target: 0)
   - Database connection errors

### Alerts

Set up alerts for:

1. **Health Check Failures**
   ```
   Condition: health_check_failures > 3 in 5 minutes
   Action: Page on-call engineer
   ```

2. **High Error Rate**
   ```
   Condition: error_rate > 1%
   Action: Slack notification, page if > 5%
   ```

3. **Resource Usage**
   ```
   Condition: cpu_usage > 80% OR memory_usage > 85%
   Action: Slack notification, auto-scale if available
   ```

## Runbook Examples

### Deployment Runbook

```
1. Check prerequisites
   - Main branch is up to date
   - All tests passing
   - No open incidents

2. Trigger production deployment
   - Go to GitHub Actions
   - Select "Deploy Production" workflow
   - Click "Run workflow"
   - Leave dry_run unchecked

3. Wait for approval
   - Designated reviewer should approve
   - Deployment proceeds after approval

4. Monitor deployment
   - Watch workflow logs
   - Verify health checks pass
   - Check Slack notifications

5. Verify deployment
   - Test API endpoints manually
   - Check web application
   - Monitor error rates

6. Document
   - Record deployment time
   - Note any issues
   - Update changelog
```

### Rollback Runbook

```
1. Assess issue
   - Is it critical? Immediate rollback needed?
   - Can it be fixed with hotfix?

2. Initiate rollback
   - SSH to production server
   - Stop current version
   - Start previous version

3. Verify rollback
   - Test health endpoints
   - Verify functionality
   - Monitor error rates

4. Communicate
   - Post in #incidents Slack channel
   - Notify stakeholders
   - Schedule post-mortem

5. Root cause analysis
   - Review logs
   - Identify what went wrong
   - Create prevention plan
```

## Emergency Procedures

### Critical Production Issue

1. **Immediately Notify**
   - Ping @oncall in Slack
   - Call on-call number if SMS not responded to

2. **Assess Impact**
   - Is service down or degraded?
   - How many users affected?
   - Is data at risk?

3. **Begin Rollback**
   - Don't wait for approval
   - Execute rollback procedure
   - Inform team of actions taken

4. **Restore Service**
   - Verify previous version working
   - Monitor metrics
   - Post status update

5. **Post-Incident**
   - Declare incident resolved
   - Schedule post-mortem for next day
   - Create prevention tickets

### Database Issues

1. **Stop Deployments**
   - Pause all automated deployments
   - Cancel any pending workflows

2. **Check Database Health**
   ```sql
   SELECT datname, state, query FROM pg_stat_activity;
   SELECT * FROM pg_stat_replication;
   ```

3. **Restore from Backup (if data lost)**
   ```bash
   # Check most recent backup
   ls -lah /backups/postgres/

   # Restore from backup
   pg_restore -d social_pro /backups/postgres/latest.dump
   ```

4. **Verify Data**
   - Check row counts
   - Verify referential integrity
   - Test critical queries

5. **Resume Operations**
   - Verify database healthy
   - Resume deployments
   - Monitor closely

## Deployment Frequency Target

- **Staging**: Multiple times per day (on every develop push)
- **Production**: 1-2 times per week (planned deployments)
- **Emergency**: As needed (critical fixes)

## Success Metrics

After each production deployment, track:

1. **Deployment Metrics**
   - Lead time (commit to production)
   - Deployment duration
   - Success/failure rate

2. **Quality Metrics**
   - Error rate trend
   - Performance degradation
   - User impact

3. **Team Metrics**
   - Incident response time
   - Rollback time
   - Deployment confidence

## References

- [Blue-Green Deployments](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Canary Deployments](https://martinfowler.com/bliki/CanaryRelease.html)
- [Database Migration Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Deployment Safety](https://www.atlassian.com/incident-management/deployment)
