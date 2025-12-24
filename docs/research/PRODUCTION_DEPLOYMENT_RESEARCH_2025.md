# Production Deployment Research 2025

## Executive Summary

This document presents research findings on implementing production deployment for the SleepCore project. Based on 2025 best practices, we recommend a Docker Compose-based deployment with Traefik reverse proxy, blue-green deployment strategy, and Prometheus/Grafana monitoring stack.

## Table of Contents

1. [Cloud Platform Analysis](#1-cloud-platform-analysis)
2. [Docker Production Best Practices](#2-docker-production-best-practices)
3. [Orchestration: Kubernetes vs Docker Compose](#3-orchestration-kubernetes-vs-docker-compose)
4. [Infrastructure as Code](#4-infrastructure-as-code)
5. [Zero-Downtime Deployment](#5-zero-downtime-deployment)
6. [Monitoring & Observability](#6-monitoring--observability)
7. [SSL/TLS & Reverse Proxy](#7-ssltls--reverse-proxy)
8. [Implementation Recommendations](#8-implementation-recommendations)

---

## 1. Cloud Platform Analysis

### Telegram Bot Hosting Comparison

| Platform | Type | Pros | Cons | Cost |
|----------|------|------|------|------|
| **DigitalOcean** | VPS/PaaS | Developer-friendly, App Platform | Manual scaling | $5-12/mo |
| **Render** | PaaS | Easy setup, auto-deploy | Cold starts on free | $7+/mo |
| **Railway** | PaaS | Modern DX, GitHub integration | Resource limits | $5+/mo |
| **Kamatera** | VPS | 30-day trial, flexible | Complex setup | $4+/mo |
| **AWS EC2** | IaaS | Full control, scalable | Complex, expensive | $10+/mo |
| **Hetzner** | VPS | European, affordable | EU only | €4+/mo |

### Recommendation for SleepCore

**Primary: DigitalOcean Droplet** ($6-12/mo)
- Simple, affordable, reliable
- Good for Telegram bots (24/7 uptime)
- Docker pre-installed images available
- European datacenter options (Frankfurt)

**Alternative: Hetzner Cloud** (€4-8/mo)
- More affordable for EU-based projects
- Excellent performance/price ratio
- CX22 (2 vCPU, 4GB RAM) sufficient for SleepCore

### Sources
- [Telegram Bot Hosting Comparison](https://grammy.dev/hosting/comparison)
- [7 Best VPS for Telegram Bot](https://hostadvice.com/vps/telegram-bot/)
- [Top Node.js Hosting Platforms 2025](https://serveravatar.com/top-nodejs-hosting-platforms-2025/)

---

## 2. Docker Production Best Practices

### Base Image Selection

```dockerfile
# Recommended: Node.js 20 Alpine LTS
FROM node:20-alpine

# Alternative: Hardened images
FROM gcr.io/distroless/nodejs20
```

**Key Benefits of Alpine:**
- Reduced attack surface
- Smaller image size (391MB vs 967MB)
- Faster deployments

### Multi-Stage Build Pattern

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/main.js"]
```

### Security Best Practices

1. **Run as non-root user**: Use `USER node`
2. **Set NODE_ENV=production**: Reduces memory by 30%
3. **Use --init flag**: Proper signal handling
4. **Pin versions**: Avoid `:latest` tags
5. **Scan images**: Use `docker scout` or Trivy

### Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:3000/health || exit 1
```

### Sources
- [Dockerizing Node.js Apps](https://betterstack.com/community/guides/scaling-nodejs/dockerize-nodejs/)
- [Docker Node.js Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Modern Docker Best Practices 2025](https://talent500.com/blog/modern-docker-best-practices-2025/)

---

## 3. Orchestration: Kubernetes vs Docker Compose

### Decision Matrix

| Factor | Docker Compose | Kubernetes |
|--------|---------------|------------|
| Learning curve | Low | High |
| Setup time | Hours | Days/Weeks |
| Team size needed | 1-5 | 5+ |
| Container count | 1-20 | 20+ |
| Auto-scaling | Limited | Built-in |
| High availability | Manual | Built-in |
| Cost | Lower | Higher |

### Recommendation: Docker Compose

For SleepCore (small team, <10 containers):
- **Docker Compose** provides optimal balance of simplicity and features
- Setup: 2 hours vs 2 weeks for Kubernetes
- Easy local development parity
- Blue-green deployment achievable with scripts

### When to Consider Kubernetes

- Team > 25 engineers
- > 20 microservices
- Multi-region deployment
- Auto-scaling requirements
- Budget for managed K8s (EKS, GKE, AKS)

### Sources
- [Docker Compose vs Kubernetes](https://betterstack.com/community/guides/scaling-docker/docker-compose-vs-kubernetes/)
- [Docker Swarm vs Kubernetes: Small Teams 2025](https://cloudcrafters.cloud/blog/docker-swarm-vs-kubernetes-small-teams-2025/)

---

## 4. Infrastructure as Code

### Recommended Stack

```
Terraform (Infrastructure) + Ansible (Configuration) + Docker Compose (Application)
```

### Terraform for Cloud Resources

```hcl
# Create DigitalOcean Droplet
resource "digitalocean_droplet" "sleepcore" {
  image    = "docker-20-04"
  name     = "sleepcore-prod"
  region   = "fra1"
  size     = "s-2vcpu-4gb"
  ssh_keys = [digitalocean_ssh_key.default.fingerprint]
}
```

### Ansible for Server Configuration

```yaml
# Configure Docker host
- name: Configure SleepCore server
  hosts: sleepcore
  roles:
    - docker
    - traefik
    - monitoring
```

### Benefits

- **Reproducible**: Same infrastructure every time
- **Version controlled**: Track changes in Git
- **Fast recovery**: 7 minutes vs 2 hours manual
- **Documentation**: Code is documentation

### Sources
- [Terraform and Ansible: Infrastructure and Deployments](https://sapalo.dev/2025/08/03/terraform-and-ansible-infrastructure-and-deployments/)
- [TADS Boilerplate](https://github.com/thomvaill/tads-boilerplate)

---

## 5. Zero-Downtime Deployment

### Strategy Comparison

| Strategy | Downtime | Rollback Speed | Complexity | Resource Usage |
|----------|----------|----------------|------------|----------------|
| **Blue-Green** | Zero | Instant | Medium | 2x during deploy |
| Rolling | Near-zero | Slow | Low | 1.5x |
| Canary | Zero | Fast | High | Variable |

### Recommended: Blue-Green Deployment

```
┌─────────────────────────────────────────────┐
│              Load Balancer / Traefik        │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
   ┌────▼────┐         ┌────▼────┐
   │  BLUE   │         │  GREEN  │
   │ (live)  │         │ (idle)  │
   └─────────┘         └─────────┘
```

### Implementation Flow

1. Deploy new version to GREEN environment
2. Run health checks on GREEN
3. Switch Traefik routing to GREEN
4. GREEN becomes BLUE (live)
5. Old BLUE becomes standby GREEN

### Docker Compose Example

```yaml
services:
  bot-blue:
    image: sleepcore/bot:${BLUE_VERSION}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.bot.rule=Host(`bot.sleepcore.app`)"

  bot-green:
    image: sleepcore/bot:${GREEN_VERSION}
    labels:
      - "traefik.enable=false"
```

### Sources
- [Zero-Downtime Blue-Green Deployments](https://dev.to/sangwoo_rhie/zero-downtime-blue-green-deployment-with-github-actions-docker-multi-stage-builds-and-nginx-695)
- [Blue-Green Deployments: Practical Guide](https://thomasbandt.com/blue-green-deployments)

---

## 6. Monitoring & Observability

### Recommended Stack

```
Prometheus (Metrics) + Grafana (Visualization) + Loki (Logs)
```

### Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Node.js    │───▶│  Prometheus  │───▶│   Grafana    │
│  prom-client │    │   :9090      │    │    :3000     │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
┌──────────────┐           │
│ Node Exporter│───────────┘
│   :9100      │
└──────────────┘
```

### Key Metrics for SleepCore

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `http_request_duration_seconds` | API latency | > 500ms |
| `process_resident_memory_bytes` | Memory usage | > 80% |
| `nodejs_active_handles_total` | Open handles | > 1000 |
| `bot_messages_total` | Messages processed | - |
| `bot_errors_total` | Error rate | > 5/min |

### Health Check Endpoints

```typescript
// /health - Liveness probe
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// /ready - Readiness probe
app.get('/ready', async (req, res) => {
  const dbOk = await checkDatabase();
  const botOk = await checkTelegramConnection();
  res.json({ database: dbOk, telegram: botOk });
});
```

### Sources
- [Prometheus Grafana Docker Compose Monitoring](https://wiunix.com/prometheus-grafana-docker-compose-monitoring/)
- [Node.js Application Monitoring](https://codersociety.com/blog/articles/nodejs-application-monitoring-with-prometheus-and-grafana)

---

## 7. SSL/TLS & Reverse Proxy

### Traefik v3 Configuration

**Benefits:**
- Automatic Let's Encrypt certificates
- Dynamic Docker container discovery
- Built-in dashboard
- Middleware support (rate limiting, auth)

### Docker Compose Setup

```yaml
services:
  traefik:
    image: traefik:v3.2
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=tech@awfond.ru"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "letsencrypt:/letsencrypt"
```

### Service Labels

```yaml
services:
  api:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.sleepcore.app`)"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.routers.api.entrypoints=websecure"
```

### Security Rating

With proper configuration:
- **SSL Labs A+** rating achievable
- HSTS enabled
- Modern TLS 1.3 only

### Sources
- [Ultimate Traefik Docker Compose Guide 2024](https://www.simplehomelab.com/traefik-v3-docker-compose-guide-2024/)
- [Traefik Let's Encrypt Compose](https://github.com/bubelov/traefik-letsencrypt-compose)

---

## 8. Implementation Recommendations

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DigitalOcean Droplet                      │
│                    (s-2vcpu-4gb, Frankfurt)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Traefik v3                        │    │
│  │            (Reverse Proxy + SSL + Dashboard)         │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                   │
│    ┌─────────────────────┼─────────────────────────┐        │
│    │                     │                         │        │
│  ┌─▼───────────┐   ┌─────▼────────┐   ┌───────────▼──┐     │
│  │ SleepCore   │   │  SleepCore   │   │   Mini App   │     │
│  │    Bot      │   │     API      │   │   (Static)   │     │
│  │   :3000     │   │    :3001     │   │    :5173     │     │
│  └─────────────┘   └──────────────┘   └──────────────┘     │
│                          │                                   │
│                    ┌─────▼─────┐                            │
│                    │ PostgreSQL │                            │
│                    │   :5432    │                            │
│                    └───────────┘                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Monitoring Stack                        │    │
│  │  Prometheus :9090 │ Grafana :3001 │ Node Exporter   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
deploy/
├── docker-compose.prod.yml      # Production stack
├── docker-compose.monitoring.yml # Monitoring stack
├── .env.prod.example            # Environment template
├── traefik/
│   ├── traefik.yml              # Static config
│   └── dynamic/                 # Dynamic configs
├── scripts/
│   ├── deploy.sh                # Deployment script
│   ├── rollback.sh              # Rollback script
│   └── backup.sh                # Backup script
└── terraform/
    └── digitalocean.tf          # Infrastructure
```

### Deployment Workflow

1. **Push to main** → GitHub Actions builds images
2. **Images pushed** to GitHub Container Registry
3. **Deploy script** pulls new images
4. **Blue-green switch** via Traefik labels
5. **Health checks** validate deployment
6. **Monitoring** alerts on issues

### Estimated Costs

| Resource | Monthly Cost |
|----------|-------------|
| DigitalOcean Droplet (s-2vcpu-4gb) | $24 |
| Domain (optional) | $1 |
| Backups | $4.80 |
| **Total** | **~$30/mo** |

---

## Conclusion

For SleepCore production deployment:

1. **Platform**: DigitalOcean Droplet (Frankfurt)
2. **Orchestration**: Docker Compose (not Kubernetes)
3. **Reverse Proxy**: Traefik v3 with auto SSL
4. **Deployment**: Blue-green strategy
5. **Monitoring**: Prometheus + Grafana
6. **IaC**: Terraform + Ansible (optional)

This architecture provides:
- Zero-downtime deployments
- Automatic SSL certificates
- Production-grade monitoring
- Easy rollback capability
- Cost-effective (~$30/mo)

---

*Research conducted: December 2025*
*Last updated: December 24, 2025*
