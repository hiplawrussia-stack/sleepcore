# SleepCore Production Deployment

This directory contains all configuration and scripts needed for production deployment.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Server                         │
│                    (DigitalOcean/Hetzner)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Traefik v3                        │    │
│  │          (Reverse Proxy + Auto SSL + Dashboard)      │    │
│  │                    :80 :443                          │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                   │
│    ┌─────────────────────┼─────────────────────────┐        │
│    │                     │                         │        │
│  ┌─▼───────────┐   ┌─────▼────────┐   ┌───────────▼──┐     │
│  │ SleepCore   │   │  SleepCore   │   │   Mini App   │     │
│  │    Bot      │   │     API      │   │   (Nginx)    │     │
│  │   :3000     │   │    :3001     │   │     :80      │     │
│  └─────────────┘   └──────┬───────┘   └──────────────┘     │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │ PostgreSQL  │                          │
│                    │    :5432    │                          │
│                    └─────────────┘                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Monitoring Stack (Optional)             │    │
│  │  Prometheus :9090 │ Grafana :3000 │ Loki            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                VK Ecosystem (Optional)               │    │
│  │  VK Bot :3002 │ VK Mini App :80 (vk.sleepcore.ru)   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## VK Ecosystem Deployment

For deploying VK integration alongside Telegram, use `docker-compose.full.yml`:

### 1. Register VK App

1. Go to [VK Developers](https://dev.vk.com/)
2. Create new app → Mini App
3. Configure app settings:
   - **App URL**: `https://vk.sleepcore.ru`
   - **Allowed domains**: `vk.sleepcore.ru`, `api.sleepcore.ru`
4. Note your `VK_APP_ID` and `VK_SECRET_KEY`

### 2. Create VK Community Bot

1. Create/use VK community (group)
2. Go to Community Settings → API Usage → Access Tokens
3. Create token with permissions: messages, docs
4. Note your `VK_BOT_TOKEN` and `VK_GROUP_ID`

### 3. Configure VK Environment Variables

Add to your `.env`:

```bash
# VK Bot
VK_BOT_TOKEN=vk1.a.xxx...
VK_GROUP_ID=123456789
ADMIN_VK_USER_IDS=123456,789012  # VK admin user IDs for crisis escalation

# VK Mini App
VK_APP_ID=12345678
VK_SECRET_KEY=xxx...
```

### 4. Deploy with VK

```bash
# Deploy full stack (TG + VK + Monitoring)
docker compose -f docker-compose.full.yml up -d

# View VK bot logs
docker compose -f docker-compose.full.yml logs -f vk-bot

# View VK mini-app logs
docker compose -f docker-compose.full.yml logs -f vk-mini-app
```

### VK-Specific Domains

| Service | Domain | Purpose |
|---------|--------|---------|
| VK Mini App | `vk.sleepcore.ru` | VK WebView iframe |
| API (VK route) | `vk.sleepcore.ru/api/*` | Same-origin proxy for RU network |
| API (direct) | `api.sleepcore.ru` | Direct API access |

### VK Health Checks

| Service | Health URL |
|---------|-----------|
| VK Bot | `http://localhost:3002/health` |
| VK Mini App | `https://vk.sleepcore.ru/health` |

## Quick Start

### 1. Server Setup (First Time Only)

```bash
# SSH into your server
ssh root@your-server-ip

# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/your-org/sleepcore/main/deploy/scripts/setup.sh | bash
```

### 2. Configure Environment

```bash
cd /opt/sleepcore/deploy

# Copy and edit environment file
cp .env.prod.example .env
nano .env
```

### 3. Login to Container Registry

```bash
# Generate a GitHub Personal Access Token with `read:packages` scope
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin
```

### 4. Deploy

```bash
./scripts/deploy.sh latest
```

## Directory Structure

```
deploy/
├── docker-compose.prod.yml      # Main production stack (TG only)
├── docker-compose.full.yml      # Full stack (TG + VK + Monitoring)
├── docker-compose.monitoring.yml # Monitoring stack (optional)
├── .env.prod.example            # Environment template
├── .env                         # Your environment (not in git)
├── traefik/
│   ├── traefik.yml              # Traefik static config
│   ├── acme.json                # SSL certificates (auto-generated)
│   └── dynamic/
│       └── middlewares.yml      # Security middlewares
├── monitoring/
│   ├── prometheus.yml           # Prometheus config
│   ├── alert_rules.yml          # Alert rules
│   └── grafana/
│       └── provisioning/        # Grafana auto-config
├── scripts/
│   ├── setup.sh                 # Initial server setup
│   ├── deploy.sh                # Deployment script
│   ├── rollback.sh              # Rollback script
│   └── backup.sh                # Database backup
└── backups/                     # Backup storage
```

## Commands

### Deployment

```bash
# Deploy latest version
./scripts/deploy.sh latest

# Deploy specific version
./scripts/deploy.sh v1.2.3

# View logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f bot
```

### Rollback

```bash
# List available versions
./scripts/rollback.sh list

# Rollback to previous version
./scripts/rollback.sh prev

# Rollback to specific version
./scripts/rollback.sh v1.2.2
```

### Database Backup

```bash
# Create full backup
./scripts/backup.sh full

# List backups
./scripts/backup.sh list

# Restore from backup
./scripts/backup.sh restore /path/to/backup.sql.gz
```

### Monitoring (Optional)

```bash
# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Access Grafana: https://grafana.your-domain.com
# Access Prometheus: https://prometheus.your-domain.com
```

## SSL Certificates

Traefik automatically obtains and renews Let's Encrypt certificates.

**Initial Setup:**
```bash
touch traefik/acme.json
chmod 600 traefik/acme.json
```

**Check Certificate Status:**
```bash
docker exec traefik cat /acme.json | jq '.letsencrypt.Certificates'
```

## Health Checks

All services expose health endpoints:

| Service | Health URL |
|---------|-----------|
| Bot (TG) | `http://localhost:3000/health` |
| API | `http://localhost:3001/health` |
| Mini App (TG) | `http://localhost:80/health` |
| Traefik | `http://localhost:8080/ping` |
| PostgreSQL | `pg_isready` command |
| VK Bot | `http://localhost:3002/health` |
| VK Mini App | `http://localhost:80/health` |

## Environment Variables

See `.env.prod.example` for all required variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DOMAIN` | Yes | Your domain (e.g., `sleepcore.app`) |
| `BOT_TOKEN` | Yes | Telegram Bot Token |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `JWT_SECRET` | Yes | API JWT secret (32+ chars) |
| `ENCRYPTION_MASTER_KEY` | **Yes** | PHI encryption key (64 hex chars) |
| `ENCRYPTION_MASTER_KEY_SALT` | **Yes** | Key derivation salt (32 hex chars) |
| `TRAEFIK_DASHBOARD_AUTH` | Yes | Dashboard htpasswd |
| `GRAFANA_ADMIN_PASSWORD` | No | Grafana password |
| `VK_BOT_TOKEN` | VK only | VK Community API token |
| `VK_GROUP_ID` | VK only | VK Community (group) ID |
| `VK_APP_ID` | VK only | VK Mini App ID |
| `VK_SECRET_KEY` | VK only | VK App secret for sign verification |
| `ADMIN_VK_USER_IDS` | VK only | VK user IDs for crisis escalation |

### PHI Encryption Setup (HIPAA/GDPR Compliance)

**⚠️ CRITICAL: These variables are required for production deployment!**

Generate the encryption key and salt:

```bash
# Generate master key (256-bit / 64 hex characters)
openssl rand -hex 32

# Generate salt (128-bit / 32 hex characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**Security Requirements:**
- Store keys in a secure secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Never commit keys to version control
- Each installation MUST have a unique salt (NIST SP 800-132)
- Backup keys securely - losing them = losing all encrypted PHI data
- **WARNING:** Changing salt after deployment invalidates all encrypted data!

## Scaling

### Vertical Scaling

Upgrade your server:
- **Minimum**: 2 vCPU, 4GB RAM (~$24/mo)
- **Recommended**: 4 vCPU, 8GB RAM (~$48/mo)

### Horizontal Scaling

For high availability, consider:
1. Managed database (DigitalOcean Managed PostgreSQL)
2. Load balancer with multiple app servers
3. Kubernetes migration (when >20 services)

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs bot

# Check container status
docker compose -f docker-compose.prod.yml ps

# Restart service
docker compose -f docker-compose.prod.yml restart bot
```

### SSL Certificate Issues

```bash
# Check Traefik logs
docker logs traefik

# Verify acme.json permissions
ls -la traefik/acme.json  # Should be 600

# Force certificate renewal
docker exec traefik rm /acme.json
docker compose -f docker-compose.prod.yml restart traefik
```

### Database Connection Issues

```bash
# Test database connection
docker exec sleepcore-postgres pg_isready -U sleepcore

# Check database logs
docker logs sleepcore-postgres

# Connect to database
docker exec -it sleepcore-postgres psql -U sleepcore
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Prune Docker resources
docker system prune -a --volumes

# Remove old backups
./scripts/backup.sh cleanup
```

## Security Checklist

### HIPAA/GDPR Compliance (Required)
- [ ] `ENCRYPTION_MASTER_KEY` generated and configured (64 hex chars)
- [ ] `ENCRYPTION_MASTER_KEY_SALT` generated and configured (32 hex chars)
- [ ] Encryption keys backed up to secure location
- [ ] Keys NOT committed to version control

### Infrastructure Security
- [ ] Changed default passwords in `.env`
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] SSH key authentication enabled
- [ ] fail2ban running
- [ ] Automatic security updates enabled
- [ ] Database backups scheduled
- [ ] Monitoring alerts configured

## Support

- **Issues**: https://github.com/your-org/sleepcore/issues
- **Email**: tech@awfond.ru
- **Emergency**: +7 908 143-08-07
