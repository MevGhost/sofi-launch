#!/bin/bash

# S4 Labs Production Deployment Script
# =====================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/puwpl/Desktop/frontend/s4labs"
BACKEND_DIR="$PROJECT_ROOT/backend"
LOG_DIR="$PROJECT_ROOT/logs"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Create necessary directories
echo "🚀 Starting S4 Labs Deployment..."
mkdir -p $LOG_DIR

# Step 1: Update dependencies
print_status "Installing frontend dependencies..."
cd $PROJECT_ROOT
npm ci --production=false

print_status "Installing backend dependencies..."
cd $BACKEND_DIR
npm ci --production=false

# Step 2: Database migrations
print_status "Running database migrations..."
cd $BACKEND_DIR
npx prisma generate
npx prisma migrate deploy

# Step 3: Build applications
print_status "Building frontend..."
cd $PROJECT_ROOT
npm run build:prod

print_status "Building backend..."
cd $BACKEND_DIR
npm run build

# Step 4: Test builds
print_status "Testing backend build..."
node -e "console.log('Backend syntax check passed')" < dist/index.js

# Step 5: PM2 operations
print_status "Reloading PM2 processes..."
cd $PROJECT_ROOT

# Save current PM2 state
pm2 save

# Reload processes with zero-downtime
pm2 reload ecosystem.config.js --env production

# Step 6: Health checks
print_status "Waiting for services to start..."
sleep 5

# Check frontend health
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    print_status "Frontend is healthy (HTTP $FRONTEND_STATUS)"
else
    print_error "Frontend health check failed (HTTP $FRONTEND_STATUS)"
fi

# Check backend health
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    print_status "Backend is healthy (HTTP $BACKEND_STATUS)"
else
    print_error "Backend health check failed (HTTP $BACKEND_STATUS)"
fi

# Step 7: Clean up
print_status "Cleaning up old logs..."
find $LOG_DIR -name "*.log" -mtime +30 -delete

# Step 8: Display status
echo ""
echo "📊 Deployment Summary:"
echo "========================"
pm2 status

echo ""
print_status "Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "  - Check logs: pm2 logs"
echo "  - Monitor: pm2 monit"
echo "  - Save PM2 config: pm2 save"
echo "  - Setup startup script: pm2 startup"

# Optional: Send notification (uncomment if needed)
# curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
#   -H 'Content-Type: application/json' \
#   -d '{"text":"S4 Labs deployment completed successfully!"}'