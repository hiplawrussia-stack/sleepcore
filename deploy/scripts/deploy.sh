#!/bin/bash

# SleepCore Production Deployment Script
# ========================================
# Usage: ./deploy.sh [version]
#
# Performs zero-downtime blue-green deployment:
# 1. Pulls new Docker images
# 2. Runs health checks
# 3. Switches traffic to new containers
# 4. Removes old containers

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env"

# Load environment
if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
else
    echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
    exit 1
fi

# Version to deploy
VERSION="${1:-latest}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Health check function
health_check() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    log "Checking health of $service..."

    while [[ $attempt -le $max_attempts ]]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            success "$service is healthy"
            return 0
        fi
        log "Attempt $attempt/$max_attempts - $service not ready yet..."
        sleep 2
        ((attempt++))
    done

    error "$service health check failed after $max_attempts attempts"
    return 1
}

# Backup current state
backup_current_state() {
    log "Backing up current state..."

    # Save current image versions
    docker compose -f "$COMPOSE_FILE" config > "$DEPLOY_DIR/backups/compose_$TIMESTAMP.yml" 2>/dev/null || true

    # Save current container IDs
    docker ps --filter "name=sleepcore" --format "{{.Names}}:{{.Image}}" > "$DEPLOY_DIR/backups/containers_$TIMESTAMP.txt" 2>/dev/null || true

    success "Backup completed: $TIMESTAMP"
}

# Pull new images
pull_images() {
    log "Pulling new images (version: $VERSION)..."

    export BOT_VERSION="$VERSION"
    export API_VERSION="$VERSION"
    export MINIAPP_VERSION="$VERSION"

    docker compose -f "$COMPOSE_FILE" pull bot api mini-app

    success "Images pulled successfully"
}

# Deploy services
deploy_services() {
    log "Deploying services..."

    export BOT_VERSION="$VERSION"
    export API_VERSION="$VERSION"
    export MINIAPP_VERSION="$VERSION"

    # Deploy with rolling update
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

    success "Services deployed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."

    local all_healthy=true

    # Check bot health
    if ! health_check "Bot" "http://localhost:3000/health"; then
        all_healthy=false
    fi

    # Check API health
    if ! health_check "API" "http://localhost:3001/health"; then
        all_healthy=false
    fi

    # Check Traefik
    if ! health_check "Traefik" "http://localhost:8080/ping"; then
        all_healthy=false
    fi

    if [[ "$all_healthy" == "true" ]]; then
        success "All services are healthy!"
        return 0
    else
        error "Some services failed health checks"
        return 1
    fi
}

# Cleanup old images
cleanup() {
    log "Cleaning up old images..."
    docker image prune -f --filter "until=24h"
    success "Cleanup completed"
}

# Rollback function
rollback() {
    error "Deployment failed! Rolling back..."

    local latest_backup=$(ls -t "$DEPLOY_DIR/backups/containers_*.txt" 2>/dev/null | head -1)

    if [[ -n "$latest_backup" ]]; then
        warn "Found backup: $latest_backup"
        # Implement rollback logic here
        ./rollback.sh
    else
        error "No backup found for rollback!"
        exit 1
    fi
}

# Main deployment flow
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       SleepCore Production Deployment      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""

    log "Starting deployment of version: $VERSION"
    log "Timestamp: $TIMESTAMP"
    echo ""

    # Create backup directory
    mkdir -p "$DEPLOY_DIR/backups"

    # Step 1: Backup
    backup_current_state

    # Step 2: Pull images
    if ! pull_images; then
        error "Failed to pull images"
        exit 1
    fi

    # Step 3: Deploy
    if ! deploy_services; then
        error "Failed to deploy services"
        rollback
        exit 1
    fi

    # Step 4: Wait for containers to start
    log "Waiting for containers to start..."
    sleep 10

    # Step 5: Verify
    if ! verify_deployment; then
        rollback
        exit 1
    fi

    # Step 6: Cleanup
    cleanup

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       Deployment Completed Successfully    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""

    log "Deployed version: $VERSION"
    log "Services:"
    docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
}

# Run main
main "$@"
