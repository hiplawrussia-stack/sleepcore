# Telegram Bot Production Deployment Research 2025

## Executive Summary

This document presents research findings on deploying Telegram bots in production environments, specifically for grammY-based Node.js bots running on VPS servers with Docker.

## Table of Contents

1. [Deployment Methods](#1-deployment-methods)
2. [Long Polling vs Webhooks](#2-long-polling-vs-webhooks)
3. [Process Management](#3-process-management)
4. [Docker Best Practices](#4-docker-best-practices)
5. [Implementation Recommendations](#5-implementation-recommendations)

---

## 1. Deployment Methods

### VPS/Container Deployment (Recommended for SleepCore)

| Method | Pros | Cons |
|--------|------|------|
| **Docker** | Isolation, reproducibility, easy rollback | Learning curve |
| **PM2** | Simple, monitoring, clustering | No isolation |
| **systemd** | Native Linux, simple | Manual setup |

### Cloud Platforms

- **Render/Railway**: Easy setup, auto-deploy
- **Fly.io**: Edge deployment, low latency
- **Cloud Run**: Serverless, pay-per-use
- **VPS (Beget/Hetzner)**: Full control, fixed cost

### Recommendation

For SleepCore: **Docker on VPS** provides the best balance of control, cost, and reliability.

### Sources
- [Telegram Bot Deployment Guide 2025](https://stellaray777.medium.com/a-developers-guide-to-building-telegram-bots-in-2025-dbc34cd22337)
- [Kuberns Bot Deployment](https://kuberns.com/blogs/post/deploy-telegram-bot/)

---

## 2. Long Polling vs Webhooks

### grammY Deployment Types

| Feature | Long Polling | Webhooks |
|---------|-------------|----------|
| Setup | Simple (`bot.start()`) | Requires HTTPS, domain |
| Scalability | Limited (~5K msg/hour) | High scalability |
| Cost | Constant connection | Pay-per-request |
| Latency | Slightly higher | Lower |
| Infrastructure | No public URL needed | Requires reverse proxy |

### Long Polling (Recommended for SleepCore)

```typescript
// Simple long polling
bot.start();

// For high load (>5K msg/hour), use grammY runner
import { run } from "@grammyjs/runner";
run(bot);
```

**Advantages:**
- No domain/SSL required
- Simpler debugging
- Full control over request rate
- Works behind NAT/firewall

### Webhooks

Required for:
- Serverless platforms (Cloudflare Workers, Vercel)
- Very high load (>100K msg/hour)
- Minimal resource usage

### Recommendation

For SleepCore on Beget VPS: **Long Polling** with Docker restart policy.

### Sources
- [grammY Deployment Types](https://grammy.dev/guide/deployment-types)
- [grammY Deployment Checklist](https://grammy.dev/advanced/deployment)

---

## 3. Process Management

### PM2 vs Docker Restart Policy

| Feature | PM2 | Docker |
|---------|-----|--------|
| Restart on crash | ✅ | ✅ |
| Resource isolation | ❌ | ✅ |
| Load balancing | ✅ (cluster) | External |
| Log management | ✅ | ✅ |
| Health checks | Limited | ✅ |
| Memory limits | ❌ | ✅ |

### Docker Approach (Recommended)

```yaml
services:
  bot:
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
```

### Key Insight

> "While PM2 provides Docker integration through pm2-runtime, the general recommendation is to forgo using PM2 if you're deploying your Node.js application with Docker."

Docker's restart policy + health checks provide equivalent functionality with better isolation.

### Sources
- [PM2 Docker Integration](https://pm2.keymetrics.io/docs/usage/docker-pm2-nodejs/)
- [PM2 vs Docker Analysis](https://medium.com/@saderi/to-pm2-or-not-to-pm2-embracing-docker-for-node-js-b4a8adce141c)

---

## 4. Docker Best Practices

### Multi-Stage Build

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/main.js"]
```

### Signal Handling

Use `dumb-init` for proper signal handling:

```dockerfile
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### Environment Variables

Follow 12-Factor App methodology:
- Never hardcode secrets
- Use `.env` for development
- Use Docker secrets or environment variables in production

### Health Checks

```typescript
// Express health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
```

### Sources
- [Dockerizing Telegram Bot](https://tjtanjin.medium.com/how-to-dockerize-a-telegram-bot-a-step-by-step-guide-b14bc427f5dc)
- [Cloud Run Security-First Approach](https://medium.com/@alexander.tyutin/running-a-production-ready-webhook-telegram-bot-on-google-cloud-run-a-security-first-approach-57b589ff8e48)

---

## 5. Implementation Recommendations

### SleepCore Bot Deployment Architecture

```
┌─────────────────────────────────────────┐
│            Beget VPS Server             │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Docker Compose Stack        │   │
│  │                                 │   │
│  │  ┌───────────┐  ┌───────────┐  │   │
│  │  │ SleepCore │  │ PostgreSQL│  │   │
│  │  │    Bot    │──│  Database │  │   │
│  │  │  :3000    │  │   :5432   │  │   │
│  │  └───────────┘  └───────────┘  │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │      Monitoring Stack           │   │
│  │  Prometheus │ Grafana           │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
          │
          │ Long Polling
          ▼
    ┌───────────┐
    │ Telegram  │
    │   API     │
    └───────────┘
```

### Docker Compose Configuration

```yaml
services:
  bot:
    build: .
    container_name: sleepcore-bot
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - BOT_TOKEN=${BOT_TOKEN}
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Deployment Checklist

- [ ] BOT_TOKEN set as environment variable
- [ ] DATABASE_URL configured
- [ ] Health check endpoint implemented
- [ ] Docker restart policy: `unless-stopped`
- [ ] Memory limits configured
- [ ] Logging to stdout/stderr
- [ ] Graceful shutdown handling

### Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await bot.stop();
  process.exit(0);
});
```

---

## Conclusion

For SleepCore on Beget VPS:

1. **Method**: Docker with `restart: unless-stopped`
2. **Updates**: Long polling (simpler, no domain needed)
3. **Process**: Docker restart policy (no PM2 needed)
4. **Image**: Multi-stage Alpine build (~150MB)
5. **Database**: PostgreSQL in separate container
6. **Monitoring**: Prometheus + Grafana (already configured)

---

*Research conducted: December 2025*
