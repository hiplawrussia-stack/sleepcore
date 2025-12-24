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
└─────────────────────────────────────────────────────────────┘
```

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
├── docker-compose.prod.yml      # Main production stack
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
| Bot | `http://localhost:3000/health` |
| API | `http://localhost:3001/health` |
| Traefik | `http://localhost:8080/ping` |
| PostgreSQL | `pg_isready` command |

## Environment Variables

See `.env.prod.example` for all required variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DOMAIN` | Yes | Your domain (e.g., `sleepcore.app`) |
| `BOT_TOKEN` | Yes | Telegram Bot Token |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `JWT_SECRET` | Yes | API JWT secret (32+ chars) |
| `TRAEFIK_DASHBOARD_AUTH` | Yes | Dashboard htpasswd |
| `GRAFANA_ADMIN_PASSWORD` | No | Grafana password |

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
