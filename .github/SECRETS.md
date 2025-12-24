# GitHub Secrets & Environment Configuration

This document describes the required secrets and environment configuration for the SleepCore CI/CD pipeline.

## Quick Setup Checklist

- [ ] Configure repository secrets
- [ ] Create `staging` environment
- [ ] Create `production` environment with protection rules
- [ ] Set up required reviewers for production
- [ ] Configure branch protection for `main`

---

## Repository Secrets

Navigate to: **Settings > Secrets and variables > Actions > Secrets**

### Required Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `BOT_TOKEN` | Telegram Bot Token from @BotFather | `123456:ABC-DEF...` |
| `DEPLOY_BOT_TOKEN` | Bot token for deployment notifications | `123456:XYZ...` |
| `DEPLOY_CHAT_ID` | Telegram chat ID for notifications | `-1001234567890` |

### Optional Secrets (for production deployment)

| Secret | Description | Example |
|--------|-------------|---------|
| `SSH_PRIVATE_KEY` | SSH key for server access | `-----BEGIN OPENSSH...` |
| `PROD_SERVER` | Production server address | `user@server.example.com` |
| `STAGING_SERVER` | Staging server address | `user@staging.example.com` |

---

## Repository Variables

Navigate to: **Settings > Secrets and variables > Actions > Variables**

| Variable | Description | Example |
|----------|-------------|---------|
| `API_URL` | Default API URL for builds | `http://localhost:3001` |
| `PRODUCTION_API_URL` | Production API URL | `https://api.sleepcore.app` |

---

## Environments

### Staging Environment

Navigate to: **Settings > Environments > New environment**

**Name:** `staging`

**Configuration:**
- No deployment branch restriction (or `release/*`, `rc-*`)
- No required reviewers
- Wait timer: 0 minutes

**Environment Secrets:**

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Staging database connection string |
| `JWT_SECRET` | JWT signing secret for staging |

**Environment Variables:**

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `staging` |
| `API_URL` | `https://staging-api.sleepcore.app` |

---

### Production Environment

Navigate to: **Settings > Environments > New environment**

**Name:** `production`

**Configuration:**
- Deployment branches: `main` only
- Required reviewers: 2+ team members
- Wait timer: 15 minutes (optional cooling period)

**Environment Secrets:**

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Production database connection string |
| `JWT_SECRET` | JWT signing secret for production |
| `OPENAI_API_KEY` | OpenAI API key (if using AI features) |
| `ANTHROPIC_API_KEY` | Anthropic API key (if using Claude) |

**Environment Variables:**

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `API_URL` | `https://api.sleepcore.app` |

---

## Branch Protection Rules

Navigate to: **Settings > Branches > Add rule**

### Main Branch (`main`)

- [x] Require a pull request before merging
  - [x] Require 1 approval
  - [x] Dismiss stale pull request approvals
- [x] Require status checks to pass before merging
  - Required checks:
    - `CI / Lint`
    - `CI / Build Core`
    - `CI / Build API`
    - `CI / Build Mini App`
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

---

## GitHub Container Registry (GHCR)

The deployment workflow uses GitHub Container Registry. No additional setup required - it uses `GITHUB_TOKEN` automatically.

Images are pushed to:
- `ghcr.io/<owner>/sleepcore/bot:<version>`
- `ghcr.io/<owner>/sleepcore/api:<version>`

---

## Workflow Permissions

Navigate to: **Settings > Actions > General > Workflow permissions**

Recommended settings:
- [x] Read and write permissions
- [x] Allow GitHub Actions to create and approve pull requests

---

## Secret Rotation Schedule

| Secret | Rotation Frequency | Notes |
|--------|-------------------|-------|
| `BOT_TOKEN` | As needed | Rotate if compromised |
| `JWT_SECRET` | Every 90 days | Update in all environments |
| `DATABASE_URL` | As needed | Coordinate with DB maintenance |
| `SSH_PRIVATE_KEY` | Every 180 days | Regenerate key pair |
| `*_API_KEY` | Every 90 days | Check provider recommendations |

---

## Troubleshooting

### Workflow not triggering

1. Check branch protection rules
2. Verify path filters in workflow
3. Check for `workflow_dispatch` permission

### Environment secrets not available

1. Verify job has `environment: <name>` specified
2. Check deployment branch restrictions
3. Ensure required reviewers approved (production)

### Docker push failing

1. Verify `packages: write` permission in workflow
2. Check GHCR login step completed successfully
3. Verify image name format is correct

---

## Security Best Practices

1. **Never commit secrets** - Use GitHub Secrets only
2. **Least privilege** - Only give workflows needed permissions
3. **Rotate regularly** - Follow rotation schedule
4. **Audit access** - Review secret access logs periodically
5. **Use environments** - Separate staging/production secrets
6. **Enable alerts** - Set up Dependabot and secret scanning

---

*Last updated: December 2025*
