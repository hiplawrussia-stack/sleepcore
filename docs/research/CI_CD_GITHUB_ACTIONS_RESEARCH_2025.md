# CI/CD Pipeline Research: GitHub Actions 2025

## Executive Summary

This document presents research findings on implementing a modern CI/CD pipeline using GitHub Actions for the SleepCore monorepo project. Research covers best practices for 2025, monorepo strategies, Playwright E2E testing integration, Docker deployment, and secrets management.

## Table of Contents

1. [GitHub Actions Best Practices 2025](#1-github-actions-best-practices-2025)
2. [Monorepo CI/CD Strategies](#2-monorepo-cicd-strategies)
3. [Playwright in GitHub Actions](#3-playwright-in-github-actions)
4. [Docker Deployment Strategies](#4-docker-deployment-strategies)
5. [Secrets Management](#5-secrets-management)
6. [Implementation Recommendations](#6-implementation-recommendations)

---

## 1. GitHub Actions Best Practices 2025

### Key Findings

Based on current industry standards and GitHub's official recommendations:

#### 1.1 Workflow Optimization

- **Parallel Jobs**: Maximize parallelization for independent tasks
- **Matrix Builds**: Test across multiple Node.js versions and OS platforms
- **Caching**: Aggressive caching of dependencies (npm, Docker layers)
- **Fail-Fast**: Use `fail-fast: false` for complete error visibility

#### 1.2 Security Hardening

- **Least Privilege**: Limit GITHUB_TOKEN permissions per job
- **Pin Actions**: Use SHA commits instead of tags (`actions/checkout@abc123...`)
- **OIDC Authentication**: Replace long-lived secrets with OIDC tokens
- **Secret Rotation**: Rotate secrets every 30-90 days

#### 1.3 Reusable Workflows

```yaml
# Call reusable workflow
jobs:
  call-workflow:
    uses: ./.github/workflows/reusable-build.yml
    with:
      node-version: '20'
    secrets: inherit
```

#### 1.4 Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Sources
- [GitHub Actions Best Practices 2025](https://blog.gitguardian.com/github-actions-security-best-practices/)
- [GitHub Well-Architected Framework](https://docs.github.com/en/actions/guides/about-github-actions)

---

## 2. Monorepo CI/CD Strategies

### Key Findings

#### 2.1 Path-Based Filtering

Only run workflows when relevant paths change:

```yaml
on:
  push:
    paths:
      - 'api/**'
      - 'package.json'
  pull_request:
    paths:
      - 'api/**'
```

#### 2.2 SleepCore Project Structure

```
sleepcore/
├── .github/workflows/     # GitHub Actions
│   ├── ci.yml            # Main CI pipeline
│   ├── e2e.yml           # E2E testing
│   └── deploy.yml        # Deployment
├── api/                   # Backend API
├── mini-app/             # React Mini App
├── e2e/                  # E2E tests
├── src/                  # Core bot
└── package.json          # Root package
```

#### 2.3 Recommended Workflow Matrix

| Workflow | Triggers | Jobs |
|----------|----------|------|
| `ci.yml` | push, PR | lint, test, build |
| `e2e.yml` | push (main), PR | playwright tests |
| `deploy.yml` | release, manual | staging, production |

#### 2.4 Dynamic Matrix Builds

```yaml
jobs:
  detect-changes:
    outputs:
      api: ${{ steps.filter.outputs.api }}
      mini-app: ${{ steps.filter.outputs.mini-app }}
    steps:
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api: 'api/**'
            mini-app: 'mini-app/**'
```

### Sources
- [GitHub Monorepo CI/CD Patterns](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [Path Filtering Action](https://github.com/dorny/paths-filter)

---

## 3. Playwright in GitHub Actions

### Key Findings

#### 3.1 Official Integration

Microsoft provides official GitHub Action for Playwright:

```yaml
- uses: microsoft/playwright-github-action@v1
```

Or install via npm:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps
```

#### 3.2 Sharding for Parallel Execution

Run tests across multiple machines:

```yaml
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: npx playwright test --shard=${{ matrix.shard }}/4
```

#### 3.3 Artifact Upload

Save test reports and traces:

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report-${{ matrix.shard }}
    path: playwright-report/
    retention-days: 30
```

#### 3.4 Browser Caching

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

#### 3.5 Container-Based Testing

```yaml
container:
  image: mcr.microsoft.com/playwright:v1.49.0-noble
```

### Sources
- [Playwright GitHub Actions Guide](https://playwright.dev/docs/ci-intro#github-actions)
- [Sharding Documentation](https://playwright.dev/docs/test-sharding)

---

## 4. Docker Deployment Strategies

### Key Findings

#### 4.1 Multi-Stage Builds

Reduce image size significantly (391MB vs 967MB):

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

#### 4.2 Layer Caching in GitHub Actions

```yaml
- uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: user/app:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

#### 4.3 Multi-Platform Builds

```yaml
- uses: docker/setup-qemu-action@v3
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64
```

#### 4.4 Staging vs Production

```yaml
jobs:
  deploy-staging:
    environment: staging
    steps:
      - run: docker build --target dev -t app:staging .

  deploy-production:
    environment: production
    needs: deploy-staging
    steps:
      - run: docker build --target prod -t app:production .
```

### Sources
- [Docker Multi-Stage Build Action](https://github.com/marketplace/actions/multi-stage-docker-build)
- [Docker Layer Caching Guide](https://evilmartians.com/chronicles/build-images-on-github-actions-with-docker-layer-caching)

---

## 5. Secrets Management

### Key Findings

#### 5.1 Environment Protection Rules (Updated November 2025)

Recent changes to `pull_request_target`:
- Workflow file always taken from default branch
- Environment branch filters may need updates
- Effective December 8, 2025

#### 5.2 Secret Hierarchy

| Level | Scope | Use Case |
|-------|-------|----------|
| Organization | All repos | Shared API keys |
| Repository | Single repo | Project-specific |
| Environment | Specific env | Production secrets |

#### 5.3 Best Practices

1. **OIDC over Long-Lived Tokens**: Use OpenID Connect for cloud providers
2. **Environment-Based Access**: Require approval for production
3. **Descriptive Naming**: `PROD_DATABASE_URL`, `STAGING_API_KEY`
4. **Regular Rotation**: 30-90 day cycle
5. **Minimal Exposure**: Only expose secrets to jobs that need them

#### 5.4 Required Reviewers

```yaml
# Repository Settings > Environments > production
# Required reviewers: @team-lead, @devops
```

#### 5.5 Branch Protection

```yaml
# Only allow deployment from main/release branches
deployment_branch_policy:
  protected_branches: true
  custom_branch_policies: false
```

### Sources
- [GitHub Secrets Best Practices](https://docs.github.com/actions/security-guides/using-secrets-in-github-actions)
- [Least Privilege for Secrets](https://github.blog/security/application-security/implementing-least-privilege-for-secrets-in-github-actions/)
- [November 2025 Protection Rule Changes](https://github.blog/changelog/2025-11-07-actions-pull_request_target-and-environment-branch-protections-changes/)

---

## 6. Implementation Recommendations

### 6.1 Workflow Architecture

```
.github/workflows/
├── ci.yml           # Lint, Test, Build (every push/PR)
├── e2e.yml          # Playwright E2E tests
├── deploy.yml       # Staging/Production deployment
└── security.yml     # Dependency scanning (weekly)
```

### 6.2 CI Workflow (`ci.yml`)

**Triggers**: Push to any branch, Pull requests

**Jobs**:
1. **Lint**: ESLint across all packages
2. **Test**: Jest unit tests with coverage
3. **Build**: TypeScript compilation
4. **Security**: npm audit

**Optimizations**:
- Dependency caching
- Parallel execution
- Path-based filtering

### 6.3 E2E Workflow (`e2e.yml`)

**Triggers**: Push to main, Pull requests

**Jobs**:
1. **Setup**: Start API + Mini App
2. **Test**: Run Playwright with sharding
3. **Report**: Upload HTML reports

**Features**:
- Container-based execution
- Browser caching
- Retry on flaky tests
- Trace on failure

### 6.4 Deploy Workflow (`deploy.yml`)

**Triggers**: Release created, Manual dispatch

**Environments**:
1. **Staging**: Auto-deploy on release candidates
2. **Production**: Requires manual approval

**Features**:
- Docker multi-stage builds
- Health checks
- Rollback capability
- Deployment notifications

### 6.5 Required Secrets

| Secret | Environment | Description |
|--------|-------------|-------------|
| `BOT_TOKEN` | All | Telegram Bot Token |
| `DATABASE_URL` | staging/production | PostgreSQL connection |
| `DOCKER_USERNAME` | All | Docker Hub username |
| `DOCKER_PASSWORD` | All | Docker Hub password |
| `SSH_PRIVATE_KEY` | production | Server SSH key |
| `SERVER_HOST` | production | Deployment server |

### 6.6 Environment Configuration

**Staging**:
- Auto-deploy on RC tags
- No approval required
- 15-minute delay before production

**Production**:
- Manual trigger or release tags
- Required reviewers (2+)
- Branch protection (main only)

---

## Conclusion

The recommended CI/CD pipeline leverages:
- **Path-based filtering** for efficient monorepo builds
- **Matrix strategies** for cross-platform testing
- **Playwright sharding** for fast E2E execution
- **Multi-stage Docker builds** for optimized images
- **Environment protection** for secure deployments

This architecture provides:
- Fast feedback loops (< 5 minutes for CI)
- Comprehensive test coverage
- Secure secret management
- Reliable deployment pipeline

---

*Research conducted: December 2025*
*Last updated: December 24, 2025*
