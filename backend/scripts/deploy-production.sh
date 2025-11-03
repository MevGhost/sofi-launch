#!/bin/bash

###############################################################################
# S4 Labs Platform - Production Deployment Script
# Comprehensive deployment automation for zero-downtime production release
###############################################################################

set -e # Exit on error
set -u # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment configuration
DEPLOY_ENV=${DEPLOY_ENV:-production}
DEPLOY_USER=${DEPLOY_USER:-ubuntu}
DEPLOY_HOST=${DEPLOY_HOST:-}
DEPLOY_PATH=${DEPLOY_PATH:-/opt/s4labs}
BACKUP_PATH=${BACKUP_PATH:-/opt/backups}
PM2_APP_NAME=${PM2_APP_NAME:-s4labs}

# Timestamps
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_PATH}/${TIMESTAMP}"

# Functions
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js version
    node_version=$(node -v | cut -d'v' -f2)
    required_version="18.0.0"
    if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
        log_error "Node.js version must be >= 18.0.0 (current: $node_version)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 not found, installing globally..."
        npm install -g pm2
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
    fi
    
    log_success "Prerequisites check passed"
}

# Run validation tests
run_validation() {
    log_info "Running production validation..."
    
    # TypeScript compilation check
    log_info "Checking TypeScript compilation..."
    npm run build || log_error "TypeScript compilation failed"
    
    # Run security audit
    log_info "Running security audit..."
    npm audit --production || log_warning "Security vulnerabilities detected - review before deployment"
    
    # Run production validator
    if [ -f "scripts/production-validator.ts" ]; then
        log_info "Running production readiness validator..."
        npx ts-node scripts/production-validator.ts || log_error "Production validation failed"
    fi
    
    log_success "Validation completed"
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        # Create backup directory
        mkdir -p "$BACKUP_DIR"
        
        # Backup current deployment
        if [ -d "$DEPLOY_PATH" ]; then
            cp -r "$DEPLOY_PATH" "$BACKUP_DIR/app"
            log_info "Application backed up to $BACKUP_DIR/app"
        fi
        
        # Backup database
        if [ -n "${DATABASE_URL:-}" ]; then
            log_info "Backing up database..."
            pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database.sql"
            log_success "Database backed up"
        fi
        
        # Backup environment files
        if [ -f ".env" ]; then
            cp .env "$BACKUP_DIR/.env.backup"
        fi
        
        log_success "Backup completed at $BACKUP_DIR"
    else
        log_info "Skipping backup in $DEPLOY_ENV environment"
    fi
}

# Build application
build_application() {
    log_info "Building application..."
    
    # Install dependencies
    log_info "Installing production dependencies..."
    npm ci --production=false # Need dev deps for build
    
    # Build TypeScript
    log_info "Building TypeScript..."
    npm run build
    
    # Build frontend if exists
    if [ -d "../" ] && [ -f "../package.json" ]; then
        log_info "Building frontend..."
        cd ../
        npm ci
        npm run build:prod
        cd -
    fi
    
    # Prune dev dependencies
    log_info "Removing development dependencies..."
    npm prune --production
    
    log_success "Build completed"
}

# Deploy to server
deploy_to_server() {
    if [ -z "$DEPLOY_HOST" ]; then
        log_warning "DEPLOY_HOST not set, skipping remote deployment"
        return
    fi
    
    log_info "Deploying to $DEPLOY_HOST..."
    
    # Create deployment directory on server
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p $DEPLOY_PATH"
    
    # Copy files
    log_info "Copying files to server..."
    rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env.local' \
        ./ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"
    
    # Install dependencies on server
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH && npm ci --production"
    
    log_success "Files deployed to server"
}

# Database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Check if Prisma migrations exist
    if [ -d "prisma/migrations" ]; then
        npx prisma migrate deploy || log_error "Database migration failed"
        log_success "Database migrations completed"
    else
        log_info "No migrations to run"
    fi
    
    # Seed database if needed
    if [ "$DEPLOY_ENV" = "staging" ] && [ -f "prisma/seed.ts" ]; then
        log_info "Seeding database..."
        npx prisma db seed
    fi
}

# Start/restart application
restart_application() {
    log_info "Restarting application with PM2..."
    
    # Check if ecosystem file exists
    if [ ! -f "ecosystem.config.js" ]; then
        log_error "ecosystem.config.js not found"
    fi
    
    # Reload application with zero-downtime
    if pm2 describe "$PM2_APP_NAME" &> /dev/null; then
        log_info "Reloading existing application..."
        pm2 reload ecosystem.config.js --update-env
    else
        log_info "Starting new application..."
        pm2 start ecosystem.config.js
    fi
    
    # Save PM2 process list
    pm2 save
    
    # Setup startup script
    pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" || true
    
    log_success "Application restarted successfully"
}

# Health check
perform_health_check() {
    log_info "Performing health check..."
    
    # Wait for application to start
    sleep 5
    
    # Check basic health endpoint
    health_url="http://localhost:${PORT:-4000}/health"
    max_attempts=10
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log_info "Waiting for application to be ready... (attempt $attempt/$max_attempts)"
        sleep 3
    done
    
    log_error "Health check failed after $max_attempts attempts"
}

# Rollback on failure
rollback() {
    log_error "Deployment failed, initiating rollback..."
    
    if [ -d "$BACKUP_DIR/app" ]; then
        log_info "Restoring from backup..."
        rm -rf "$DEPLOY_PATH"
        cp -r "$BACKUP_DIR/app" "$DEPLOY_PATH"
        
        # Restore database if backup exists
        if [ -f "$BACKUP_DIR/database.sql" ]; then
            log_info "Restoring database..."
            psql "$DATABASE_URL" < "$BACKUP_DIR/database.sql"
        fi
        
        # Restart with previous version
        restart_application
        
        log_warning "Rollback completed - previous version restored"
    else
        log_error "No backup available for rollback"
    fi
    
    exit 1
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Keep only last 5 backups
    if [ -d "$BACKUP_PATH" ]; then
        cd "$BACKUP_PATH"
        ls -t | tail -n +6 | xargs -r rm -rf
        cd -
    fi
    
    log_success "Cleanup completed"
}

# Post-deployment tasks
post_deployment() {
    log_info "Running post-deployment tasks..."
    
    # Clear application cache
    if [ -n "${REDIS_URL:-}" ]; then
        log_info "Clearing Redis cache..."
        redis-cli -u "$REDIS_URL" FLUSHDB || log_warning "Could not clear Redis cache"
    fi
    
    # Warm up cache
    log_info "Warming up cache..."
    curl -s "http://localhost:${PORT:-4000}/api/tokens" > /dev/null || true
    curl -s "http://localhost:${PORT:-4000}/api/stats" > /dev/null || true
    
    # Send deployment notification (optional)
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ S4 Labs deployed to $DEPLOY_ENV successfully! Version: $TIMESTAMP\"}" \
            "$SLACK_WEBHOOK" || true
    fi
    
    # Log deployment
    echo "[$TIMESTAMP] Deployment to $DEPLOY_ENV completed" >> deployments.log
    
    log_success "Post-deployment tasks completed"
}

# Show deployment summary
show_summary() {
    echo
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${GREEN}🚀 DEPLOYMENT SUCCESSFUL${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo "Environment: $DEPLOY_ENV"
    echo "Timestamp: $TIMESTAMP"
    echo "Application: $PM2_APP_NAME"
    
    # Show PM2 status
    echo
    pm2 status
    
    echo
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${GREEN}✅ S4 Labs is now live in production!${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo
    
    # Show important URLs
    echo "📌 Important URLs:"
    echo "   - Health Check: http://localhost:${PORT:-4000}/health"
    echo "   - API Docs: http://localhost:${PORT:-4000}/api-docs"
    echo "   - Metrics: http://localhost:${PORT:-4000}/metrics"
    echo
    echo "📊 Monitor logs with: pm2 logs $PM2_APP_NAME"
    echo "📈 View metrics with: pm2 monit"
    echo
}

# Main deployment flow
main() {
    echo "═══════════════════════════════════════════════════════════════"
    echo "S4 Labs Production Deployment Script"
    echo "Environment: $DEPLOY_ENV"
    echo "═══════════════════════════════════════════════════════════════"
    echo
    
    # Set error trap
    trap rollback ERR
    
    # Execute deployment steps
    check_prerequisites
    run_validation
    create_backup
    build_application
    deploy_to_server
    run_migrations
    restart_application
    perform_health_check
    post_deployment
    cleanup_old_backups
    
    # Remove error trap after successful deployment
    trap - ERR
    
    show_summary
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   log_error "Please do not run this script as root"
fi

# Load environment variables
if [ -f ".env.$DEPLOY_ENV" ]; then
    export $(grep -v '^#' ".env.$DEPLOY_ENV" | xargs)
elif [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Run main deployment
main "$@"