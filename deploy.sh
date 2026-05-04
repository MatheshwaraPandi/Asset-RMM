#!/bin/bash

# Asset-RMM Deployment Script
# This script clones the repository and deploys the application using Docker Compose

set -e

# Configuration
REPO_URL="https://github.com/MatheshwaraPandi/Asset-RMM.git"
BRANCH="Feat-Emp-Asset-Tracking-04.05.26"
DEPLOY_DIR="/opt/asset-rmm"
APP_DOMAIN="asset-mgmt.sgtstaging.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root. Use: sudo bash deploy.sh"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
    fi
    log_success "Docker is installed"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    log_success "Docker Compose is installed"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
    fi
    log_success "Git is installed"
}

# Create deployment directory
setup_directory() {
    log_info "Setting up deployment directory..."
    
    if [ -d "$DEPLOY_DIR" ]; then
        log_warning "Directory $DEPLOY_DIR already exists. Using existing directory."
    else
        mkdir -p "$DEPLOY_DIR"
        log_success "Created directory $DEPLOY_DIR"
    fi
}

# Clone repository
clone_repository() {
    log_info "Cloning repository from $REPO_URL..."
    
    if [ -d "$DEPLOY_DIR/.git" ]; then
        log_info "Repository already exists. Pulling latest changes..."
        cd "$DEPLOY_DIR"
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    else
        cd "$DEPLOY_DIR" || mkdir -p "$DEPLOY_DIR" && cd "$DEPLOY_DIR"
        git clone --branch "$BRANCH" "$REPO_URL" .
    fi
    
    log_success "Repository cloned/updated successfully"
}

# Setup environment files
setup_environment() {
    log_info "Setting up environment files..."
    
    cd "$DEPLOY_DIR"
    
    # Backup existing .env files if they exist
    if [ -f "backend/.env" ]; then
        log_info "Backing up existing backend/.env to backend/.env.backup"
        cp backend/.env backend/.env.backup
    fi
    
    if [ -f "frontend/.env.local" ]; then
        log_info "Backing up existing frontend/.env.local to frontend/.env.local.backup"
        cp frontend/.env.local frontend/.env.local.backup
    fi
    
    # Create/update backend .env
    log_info "Configuring backend/.env..."
    cat > backend/.env <<EOF
# Production database
DATABASE_URL=postgresql+psycopg2://asset_rmm_user:change_me_secure@postgres:5432/asset_rmm

# JWT Configuration
SECRET_KEY=your-secret-key-here-change-this-to-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
OTP_EXPIRE_SECONDS=600

# Default Admin Credentials (CHANGE THESE IN PRODUCTION)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
HR_USERNAME=hradmin
HR_PASSWORD=hr123

# Application URLs
CORS_ORIGINS=https://${APP_DOMAIN}
NEXTAUTH_URL=https://${APP_DOMAIN}
NEXT_PUBLIC_APP_URL=https://${APP_DOMAIN}

# SMTP Configuration (Optional - for email OTP)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USERNAME=your-org-email@yourcompany.com
SMTP_PASSWORD=replace-with-your-password-or-app-password
SMTP_FROM_EMAIL=your-org-email@yourcompany.com
SMTP_USE_TLS=true
OTP_EMAIL_SUBJECT=Your RMM Lite login code
EOF
    log_success "backend/.env configured"
    
    # Create/update frontend .env.local
    log_info "Configuring frontend/.env.local..."
    cat > frontend/.env.local <<EOF
# API Configuration
BACKEND_API_URL=https://${APP_DOMAIN}
NEXT_PUBLIC_BACKEND_API_URL=https://${APP_DOMAIN}

# Application URLs
NEXT_PUBLIC_APP_URL=https://${APP_DOMAIN}
NEXTAUTH_URL=https://${APP_DOMAIN}

# NextAuth Secret (CHANGE THIS IN PRODUCTION)
NEXTAUTH_SECRET=your-nextauth-secret-here-change-this-to-random-string

# Organization Configuration
NEXT_PUBLIC_ORG_NAME=SvaaN Global Tech
NEXT_PUBLIC_ORG_SHORT_NAME=SGT
NEXT_PUBLIC_ORG_SUBTITLE=Unified asset operations, repair tracking, and HR visibility
NEXT_PUBLIC_ORG_LOGO_URL=/svaan-logo.png
EOF
    log_success "frontend/.env.local configured"
}

# Generate secure secrets
generate_secrets() {
    log_info "Generating secure secrets..."
    
    cd "$DEPLOY_DIR"
    
    # Generate SECRET_KEY
    SECRET_KEY=$(openssl rand -base64 32)
    sed -i "s/your-secret-key-here-change-this-to-random-string/${SECRET_KEY}/g" backend/.env
    
    # Generate NEXTAUTH_SECRET
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    sed -i "s/your-nextauth-secret-here-change-this-to-random-string/${NEXTAUTH_SECRET}/g" frontend/.env.local
    
    log_success "Secrets generated and saved"
}

# Build and start Docker containers
start_containers() {
    log_info "Building and starting Docker containers..."
    
    cd "$DEPLOY_DIR"
    
    # Pull latest images
    log_info "Pulling latest Docker images..."
    docker-compose pull
    
    # Build images
    log_info "Building Docker images..."
    docker-compose build
    
    # Start containers
    log_info "Starting containers..."
    docker-compose up -d
    
    log_success "Containers started successfully"
}

# Wait for services to be ready
wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U asset_rmm_user > /dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL did not start in time"
        fi
        sleep 2
    done
    
    # Wait for Backend
    log_info "Waiting for Backend to be ready..."
    for i in {1..30}; do
        if curl -f http://localhost:8000/docs > /dev/null 2>&1; then
            log_success "Backend is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Backend did not start in time"
        fi
        sleep 2
    done
    
    # Wait for Frontend
    log_info "Waiting for Frontend to be ready..."
    for i in {1..30}; do
        if curl -f http://localhost:80 > /dev/null 2>&1; then
            log_success "Frontend is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Frontend did not start in time"
        fi
        sleep 2
    done
}

# Show container status
show_status() {
    log_info "Container status:"
    cd "$DEPLOY_DIR"
    docker-compose ps
}

# Display deployment information
show_deployment_info() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Asset-RMM Deployment Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Application Domain: ${BLUE}https://${APP_DOMAIN}${NC}"
    echo -e "Backend API: ${BLUE}https://${APP_DOMAIN} (via reverse proxy)${NC}"
    echo -e "Frontend: ${BLUE}https://${APP_DOMAIN}${NC}"
    echo ""
    echo -e "PostgreSQL: ${BLUE}localhost:5432${NC}"
    echo -e "Backend Port: ${BLUE}8000${NC}"
    echo -e "Frontend Port: ${BLUE}80${NC}"
    echo ""
    echo -e "Deployment Directory: ${BLUE}${DEPLOY_DIR}${NC}"
    echo ""
    echo -e "${YELLOW}Important:${NC}"
    echo "1. Update your reverse proxy to forward traffic to this server"
    echo "2. Configure SSL/TLS certificates for HTTPS"
    echo "3. Update SMTP credentials in backend/.env for email functionality"
    echo "4. Change default admin credentials (ADMIN_PASSWORD, HR_PASSWORD)"
    echo "5. Change SECRET_KEY and NEXTAUTH_SECRET to unique values"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  View logs:              cd ${DEPLOY_DIR} && docker-compose logs -f"
    echo "  Stop containers:        cd ${DEPLOY_DIR} && docker-compose down"
    echo "  Restart containers:     cd ${DEPLOY_DIR} && docker-compose restart"
    echo "  Update and redeploy:    cd ${DEPLOY_DIR} && git pull && docker-compose up -d --build"
    echo ""
}

# Main deployment flow
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Asset-RMM Deployment Script${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    check_root
    check_prerequisites
    setup_directory
    clone_repository
    setup_environment
    generate_secrets
    start_containers
    wait_for_services
    show_status
    show_deployment_info
}

# Run main function
main
