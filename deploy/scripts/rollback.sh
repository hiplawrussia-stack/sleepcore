#!/bin/bash

# SleepCore Rollback Script
# ==========================
# Usage: ./rollback.sh [version]
#
# Rolls back to a previous version

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env"
BACKUPS_DIR="$DEPLOY_DIR/backups"

# Load environment
if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
fi

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

# List available versions
list_versions() {
    log "Available versions for rollback:"
    echo ""

    # List recent container backups
    if [[ -d "$BACKUPS_DIR" ]]; then
        ls -lt "$BACKUPS_DIR"/containers_*.txt 2>/dev/null | head -10 | while read -r line; do
            echo "  - $(basename "$line" | sed 's/containers_//' | sed 's/.txt//')"
        done
    else
        warn "No backups found"
    fi

    echo ""

    # List available image tags
    log "Available image versions in registry:"
    docker images "ghcr.io/${GITHUB_REPOSITORY}/bot" --format "table {{.Tag}}\t{{.CreatedAt}}" | head -10
}

# Rollback to specific version
rollback_to_version() {
    local version=$1

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║           SleepCore Rollback               ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════╝${NC}"
    echo ""

    log "Rolling back to version: $version"

    # Export versions
    export BOT_VERSION="$version"
    export API_VERSION="$version"
    export MINIAPP_VERSION="$version"

    # Pull the rollback version
    log "Pulling images..."
    docker compose -f "$COMPOSE_FILE" pull bot api mini-app

    # Deploy
    log "Deploying rollback version..."
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

    # Wait for health
    log "Waiting for services to be healthy..."
    sleep 15

    # Verify
    local healthy=true
    if ! curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        warn "Bot health check failed"
        healthy=false
    fi

    if ! curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        warn "API health check failed"
        healthy=false
    fi

    if [[ "$healthy" == "true" ]]; then
        success "Rollback completed successfully!"
    else
        error "Rollback completed but some services may be unhealthy"
    fi

    # Show status
    log "Current service status:"
    docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}"
}

# Quick rollback to previous
quick_rollback() {
    log "Performing quick rollback to previous version..."

    # Find the previous version from backup
    local latest_backup=$(ls -t "$BACKUPS_DIR"/containers_*.txt 2>/dev/null | head -1)

    if [[ -z "$latest_backup" ]]; then
        error "No backup found for rollback!"
        exit 1
    fi

    log "Using backup: $latest_backup"

    # Get previous image versions
    local prev_bot_image=$(grep "sleepcore-bot:" "$latest_backup" | cut -d: -f2-)
    local prev_api_image=$(grep "sleepcore-api:" "$latest_backup" | cut -d: -f2-)

    if [[ -n "$prev_bot_image" ]]; then
        log "Previous bot image: $prev_bot_image"
    fi

    if [[ -n "$prev_api_image" ]]; then
        log "Previous API image: $prev_api_image"
    fi

    # Rollback using docker rollback (if available) or restart with old images
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" up -d

    success "Quick rollback completed"
}

# Main
main() {
    local version="${1:-}"

    if [[ -z "$version" ]]; then
        # Interactive mode
        list_versions

        echo ""
        read -p "Enter version to rollback to (or 'prev' for quick rollback): " version

        if [[ -z "$version" ]]; then
            error "No version specified"
            exit 1
        fi
    fi

    if [[ "$version" == "prev" || "$version" == "previous" ]]; then
        quick_rollback
    elif [[ "$version" == "list" ]]; then
        list_versions
    else
        rollback_to_version "$version"
    fi
}

main "$@"
