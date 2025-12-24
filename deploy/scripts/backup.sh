#!/bin/bash

# SleepCore Database Backup Script
# =================================
# Usage: ./backup.sh [type]
#   type: full | incremental | manual
#
# Creates backups of PostgreSQL database

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
ENV_FILE="$DEPLOY_DIR/.env"
BACKUP_DIR="$DEPLOY_DIR/backups/database"
RETENTION_DAYS=30

# Load environment
if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
fi

# Defaults
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sleepcore-postgres}"
POSTGRES_DB="${POSTGRES_DB:-sleepcore}"
POSTGRES_USER="${POSTGRES_USER:-sleepcore}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

# Create backup directory
setup() {
    mkdir -p "$BACKUP_DIR"
    log "Backup directory: $BACKUP_DIR"
}

# Full database backup
full_backup() {
    local backup_file="$BACKUP_DIR/${POSTGRES_DB}_full_${TIMESTAMP}.sql.gz"

    log "Creating full backup..."

    docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --format=plain \
        --no-owner \
        --no-acl \
        | gzip > "$backup_file"

    if [[ -f "$backup_file" ]]; then
        local size=$(du -h "$backup_file" | cut -f1)
        success "Full backup created: $backup_file ($size)"
    else
        error "Backup failed!"
        return 1
    fi
}

# Custom format backup (for pg_restore)
custom_backup() {
    local backup_file="$BACKUP_DIR/${POSTGRES_DB}_custom_${TIMESTAMP}.dump"

    log "Creating custom format backup..."

    docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --format=custom \
        --compress=9 \
        > "$backup_file"

    if [[ -f "$backup_file" ]]; then
        local size=$(du -h "$backup_file" | cut -f1)
        success "Custom backup created: $backup_file ($size)"
    else
        error "Backup failed!"
        return 1
    fi
}

# Schema only backup
schema_backup() {
    local backup_file="$BACKUP_DIR/${POSTGRES_DB}_schema_${TIMESTAMP}.sql"

    log "Creating schema backup..."

    docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --schema-only \
        > "$backup_file"

    success "Schema backup created: $backup_file"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."

    local deleted_count=0
    while IFS= read -r -d '' file; do
        rm -f "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -print0 2>/dev/null)

    if [[ $deleted_count -gt 0 ]]; then
        log "Deleted $deleted_count old backup(s)"
    else
        log "No old backups to clean up"
    fi
}

# List backups
list_backups() {
    log "Available backups:"
    echo ""

    if [[ -d "$BACKUP_DIR" ]]; then
        ls -lh "$BACKUP_DIR" 2>/dev/null | tail -n +2
    else
        warn "No backups found"
    fi
}

# Restore from backup
restore_backup() {
    local backup_file=$1

    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        return 1
    fi

    warn "This will OVERWRITE the current database!"
    read -p "Are you sure? (yes/no): " confirm

    if [[ "$confirm" != "yes" ]]; then
        log "Restore cancelled"
        return 0
    fi

    log "Restoring from: $backup_file"

    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | docker exec -i "$POSTGRES_CONTAINER" psql \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB"
    elif [[ "$backup_file" == *.dump ]]; then
        docker exec -i "$POSTGRES_CONTAINER" pg_restore \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --clean \
            --if-exists \
            < "$backup_file"
    else
        docker exec -i "$POSTGRES_CONTAINER" psql \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            < "$backup_file"
    fi

    success "Database restored successfully"
}

# Verify backup
verify_backup() {
    local backup_file=$1

    log "Verifying backup: $backup_file"

    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found"
        return 1
    fi

    local size=$(du -h "$backup_file" | cut -f1)

    if [[ "$backup_file" == *.gz ]]; then
        local lines=$(gunzip -c "$backup_file" | wc -l)
        success "Backup verified: $size, $lines lines"
    elif [[ "$backup_file" == *.dump ]]; then
        docker exec -i "$POSTGRES_CONTAINER" pg_restore \
            --list < "$backup_file" > /dev/null 2>&1
        if [[ $? -eq 0 ]]; then
            success "Backup verified: $size (custom format valid)"
        else
            error "Backup appears to be corrupted"
            return 1
        fi
    else
        local lines=$(wc -l < "$backup_file")
        success "Backup verified: $size, $lines lines"
    fi
}

# Main
main() {
    local command="${1:-full}"

    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         SleepCore Database Backup          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""

    setup

    case "$command" in
        full)
            full_backup
            cleanup_old_backups
            ;;
        custom)
            custom_backup
            cleanup_old_backups
            ;;
        schema)
            schema_backup
            ;;
        list)
            list_backups
            ;;
        restore)
            restore_backup "${2:-}"
            ;;
        verify)
            verify_backup "${2:-}"
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {full|custom|schema|list|restore|verify|cleanup}"
            echo ""
            echo "Commands:"
            echo "  full     - Create full SQL backup (default)"
            echo "  custom   - Create pg_dump custom format backup"
            echo "  schema   - Backup schema only"
            echo "  list     - List available backups"
            echo "  restore  - Restore from backup file"
            echo "  verify   - Verify backup integrity"
            echo "  cleanup  - Remove old backups"
            exit 1
            ;;
    esac
}

main "$@"
