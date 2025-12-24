#!/bin/bash

# SleepCore Initial Server Setup Script
# ======================================
# Usage: ./setup.sh
#
# Run this script on a fresh server to set up the production environment

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
}

# Update system
update_system() {
    log "Updating system packages..."
    apt-get update && apt-get upgrade -y
    success "System updated"
}

# Install Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log "Docker already installed: $(docker --version)"
        return
    fi

    log "Installing Docker..."

    # Install prerequisites
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

    # Set up stable repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Enable and start Docker
    systemctl enable docker
    systemctl start docker

    success "Docker installed: $(docker --version)"
}

# Create sleepcore user
create_user() {
    local username="sleepcore"

    if id "$username" &>/dev/null; then
        log "User $username already exists"
        return
    fi

    log "Creating user: $username"
    useradd -m -s /bin/bash "$username"
    usermod -aG docker "$username"

    success "User $username created and added to docker group"
}

# Setup firewall
setup_firewall() {
    log "Configuring firewall..."

    # Install ufw if not present
    apt-get install -y ufw

    # Default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow ssh

    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Enable firewall
    echo "y" | ufw enable

    success "Firewall configured"
    ufw status
}

# Create directory structure
create_directories() {
    log "Creating directory structure..."

    local base_dir="/opt/sleepcore"

    mkdir -p "$base_dir"/{deploy,backups,logs}
    mkdir -p "$base_dir/deploy/traefik"
    mkdir -p "$base_dir/deploy/scripts"
    mkdir -p "$base_dir/deploy/monitoring"

    # Set permissions
    chown -R sleepcore:sleepcore "$base_dir"

    success "Directories created at $base_dir"
}

# Create Docker network
create_network() {
    log "Creating Docker network..."

    if docker network inspect sleepcore-network &>/dev/null; then
        log "Network sleepcore-network already exists"
        return
    fi

    docker network create sleepcore-network

    success "Docker network created: sleepcore-network"
}

# Setup Let's Encrypt
setup_letsencrypt() {
    log "Setting up Let's Encrypt..."

    local acme_file="/opt/sleepcore/deploy/traefik/acme.json"

    touch "$acme_file"
    chmod 600 "$acme_file"
    chown sleepcore:sleepcore "$acme_file"

    success "ACME file created: $acme_file"
}

# Install useful tools
install_tools() {
    log "Installing useful tools..."

    apt-get install -y \
        htop \
        vim \
        curl \
        wget \
        git \
        jq \
        ncdu \
        apache2-utils \
        fail2ban

    success "Tools installed"
}

# Configure fail2ban
setup_fail2ban() {
    log "Configuring fail2ban..."

    systemctl enable fail2ban
    systemctl start fail2ban

    success "fail2ban configured"
}

# Setup automatic security updates
setup_auto_updates() {
    log "Configuring automatic security updates..."

    apt-get install -y unattended-upgrades
    dpkg-reconfigure -plow unattended-upgrades

    success "Automatic updates configured"
}

# Generate htpasswd for Traefik dashboard
generate_htpasswd() {
    log "Generating htpasswd for Traefik dashboard..."

    echo ""
    read -p "Enter username for Traefik dashboard [admin]: " username
    username="${username:-admin}"

    read -sp "Enter password: " password
    echo ""

    local hash=$(htpasswd -nbB "$username" "$password")
    echo ""
    log "Add this to your .env file as TRAEFIK_DASHBOARD_AUTH:"
    echo ""
    echo "$hash" | sed 's/\$/\$\$/g'
    echo ""
}

# Print next steps
print_next_steps() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       Initial Setup Complete!              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Copy deployment files to /opt/sleepcore/deploy/"
    echo ""
    echo "2. Create .env file from .env.prod.example:"
    echo "   cp .env.prod.example .env"
    echo "   nano .env"
    echo ""
    echo "3. Log in to GitHub Container Registry:"
    echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
    echo ""
    echo "4. Run the deployment:"
    echo "   ./scripts/deploy.sh latest"
    echo ""
    echo "5. (Optional) Set up monitoring:"
    echo "   docker compose -f docker-compose.monitoring.yml up -d"
    echo ""
}

# Main
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     SleepCore Server Setup Script          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""

    check_root
    update_system
    install_docker
    create_user
    install_tools
    setup_firewall
    setup_fail2ban
    setup_auto_updates
    create_directories
    create_network
    setup_letsencrypt
    generate_htpasswd
    print_next_steps
}

main "$@"
