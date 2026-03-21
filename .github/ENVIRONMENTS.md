# GitHub Actions Environments Setup Guide

This guide explains how to configure GitHub Environments for Social Pro's CI/CD pipeline.

## Overview

GitHub Environments provide a way to:
- Control deployment targets
- Require manual approvals
- Store environment-specific secrets
- Track deployments

## Creating Environments

### 1. Navigate to Repository Settings

1. Go to your GitHub repository
2. Click **Settings** (top navigation)
3. In left sidebar, expand **Deployments** section
4. Click **Environments**

### 2. Create Staging Environment

Click **New environment**

**Configuration:**
- **Environment name**: `staging`
- **Deployment branches and tags**: `develop`
- **Required reviewers**: (optional, leave empty for auto-deployment)
- **Restrict deployments to specific branches or tags**: (optional, leave unchecked)

**Save environment.**

### 3. Create Production Environment

Click **New environment**

**Configuration:**
- **Environment name**: `production`
- **Deployment branches and tags**: `main`
- **Required reviewers**:
  - Check **Require reviewers**
  - Add team members or organizations that can approve
- **Protect environment variable and secret**: (recommended, check this)

**Save environment.**

## Adding Environment Secrets

### For Staging Environment

1. Click on **staging** environment
2. Under "Environment secrets", click **Add secret**
3. Add each secret:

| Secret Name | Example Value | Description |
|-------------|---------------|-------------|
| `STAGING_API_HOST` | `api.staging.example.com` | Staging API hostname |
| `STAGING_WEB_HOST` | `staging.example.com` | Staging web hostname |
| `STAGING_API_URL` | `https://api.staging.example.com` | Full API URL for health checks |
| `STAGING_WEB_URL` | `https://staging.example.com` | Full web URL for health checks |
| `STAGING_SSH_KEY` | (SSH private key content) | SSH key for deployment |
| `STAGING_SSH_USER` | `deploy` | SSH user for deployment |

### For Production Environment

1. Click on **production** environment
2. Under "Environment secrets", click **Add secret**
3. Add each secret:

| Secret Name | Example Value | Description |
|-------------|---------------|-------------|
| `PROD_API_HOST` | `api.example.com` | Production API hostname |
| `PROD_WEB_HOST` | `example.com` | Production web hostname |
| `PROD_API_URL` | `https://api.example.com` | Full API URL for health checks |
| `PROD_WEB_URL` | `https://example.com` | Full web URL for health checks |
| `PROD_SSH_KEY` | (SSH private key content) | SSH key for deployment |
| `PROD_SSH_USER` | `deploy` | SSH user for deployment |
| `PROD_DATABASE_URL` | `postgresql://...` | Production database URL |

## Adding Repository Secrets

These secrets are available to all workflows and environments.

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following:

| Secret Name | Example Value | Description |
|-------------|---------------|-------------|
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/...` | Slack webhook for notifications |

## SSH Key Setup

For secure deployment via SSH:

### Generate SSH Key (if you don't have one)

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""

# This creates:
# - deploy_key (private key - use for GitHub secret)
# - deploy_key.pub (public key - use on target servers)
```

### Add Public Key to Target Servers

On each deployment target server:

```bash
# On staging server
mkdir -p ~/.ssh
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions-deploy
EOF
chmod 600 ~/.ssh/authorized_keys
```

### Add Private Key to GitHub Secrets

1. Copy contents of private key file (`deploy_key`)
2. Add to `STAGING_SSH_KEY` and/or `PROD_SSH_KEY` secrets as shown above

## Test Deployment Connection

Create a test workflow to verify SSH connectivity:

```yaml
name: Test SSH Connection

on:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Test SSH connection
        env:
          SSH_KEY: ${{ secrets.STAGING_SSH_KEY }}
          SSH_USER: ${{ secrets.STAGING_SSH_USER }}
          SSH_HOST: ${{ secrets.STAGING_API_HOST }}
        run: |
          mkdir -p ~/.ssh
          echo "$SSH_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no \
            $SSH_USER@$SSH_HOST "echo 'SSH connection successful'"
```

## Slack Notifications Setup

### Create Slack Webhook

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Create New App → From scratch
3. **App name**: `Social Pro CI/CD`
4. **Development Workspace**: Select your workspace
5. In left sidebar: **Incoming Webhooks**
6. Toggle **Activate Incoming Webhooks** to On
7. Click **Add New Webhook to Workspace**
8. Select channel (e.g., `#deployments` or `#ci-cd`)
9. Click **Allow**
10. Copy the webhook URL (starts with `https://hooks.slack.com/...`)

### Add Webhook to GitHub Secrets

1. Go to GitHub repository Settings
2. **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. **Name**: `SLACK_WEBHOOK_URL`
5. **Secret**: Paste the webhook URL
6. Click **Add secret**

### Test Slack Notifications

Push to develop branch and watch for Slack message in your selected channel.

## Database URL for Production

### Generate Production Database URL

Format:
```
postgresql://username:password@host:5432/database_name
```

Example:
```
postgresql://prod_user:secure_password@db.example.com:5432/social_pro
```

### Add to Production Secrets

1. Navigate to **production** environment
2. Add `PROD_DATABASE_URL` secret
3. Paste the connection string

## Verify Environment Setup

### Check Environment Secrets are Accessible

Secrets should be accessible during workflow runs:

1. Go to **Actions** tab
2. Select a recent workflow run
3. Click on any job
4. Expand step that uses secrets
5. You should see `***` for masked secrets (not actual values)

### Test with Dry Run Deployment

1. Trigger production deployment workflow manually
2. Enable `dry_run` input flag
3. This will print deployment commands without executing them
4. Verify all secrets are properly masked in logs

## Troubleshooting

### Secrets Not Available

**Problem**: Workflow says secret is undefined

**Solution**:
1. Verify secret exists in the correct environment
2. Check workflow has `environment: staging` or `environment: production`
3. Ensure secret name matches exactly (case-sensitive)
4. Try pushing a new commit to refresh

### Deployment Approval Not Triggered

**Problem**: Production deployment doesn't require approval

**Solution**:
1. Verify environment has **Required reviewers** configured
2. Check that reviewer is the current user or in a team with access
3. Ensure workflow has `environment: production` specified
4. Check deployment isn't skipped by conditions

### SSH Connection Timeout

**Problem**: SSH connection fails during deployment

**Solution**:
1. Verify SSH public key is on target server
2. Check SSH user is correct (`deploy` or other account)
3. Verify host is accessible from GitHub runners (firewall rules)
4. Test locally: `ssh -i deploy_key deploy@host echo test`

### Webhook URL Not Working

**Problem**: Slack notifications not arriving

**Solution**:
1. Verify webhook URL is still active (regenerate if needed)
2. Check secret value is exactly correct (no extra spaces)
3. Verify Slack bot permissions in workspace
4. Check channel exists and bot has access

## Best Practices

1. **Keep Secrets Secure**
   - Never commit secrets to repo
   - Rotate SSH keys quarterly
   - Use GitHub's secret scanning

2. **Environment Parity**
   - Keep staging config close to production
   - Test deployment procedures in staging first
   - Document differences between environments

3. **Access Control**
   - Limit production reviewers to team leads
   - Use GitHub teams for better access management
   - Audit who has approval rights regularly

4. **Monitoring**
   - Set up Slack notifications for all deployments
   - Monitor GitHub Actions usage and costs
   - Review workflow logs for security issues

5. **Documentation**
   - Keep deployment runbooks updated
   - Document emergency rollback procedures
   - Maintain list of on-call contacts

## References

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Deployments API](https://docs.github.com/en/rest/deployments/)
