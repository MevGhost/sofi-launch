#!/bin/bash

# Production Deployment Script for S4 Labs
# Deploy to VPS at 34.45.62.154
# Domain: s4labs.xyz

set -e  # Exit on error

# Configuration
VPS_IP="34.45.62.154"
VPS_USER="root"  # Change if using different user
DOMAIN="s4labs.xyz"
API_DOMAIN="api.s4labs.xyz"
DEPLOY_PATH="/var/www/s4labs"
NGINX_SITES="/etc/nginx/sites-available"
SYSTEMD_PATH="/etc/systemd/system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

echo "🚀 S4 Labs Production Deployment"
echo "================================"
echo "VPS: ${VPS_IP}"
echo "Domain: ${DOMAIN}"
echo "================================"

# Step 1: Build production bundles locally
echo ""
echo "📦 Building production bundles..."

# Build frontend
print_info "Building frontend..."
npm run build
print_success "Frontend built"

# Build backend
print_info "Building backend..."
cd backend
npm run build
cd ..
print_success "Backend built"

# Step 2: Prepare deployment package
echo ""
echo "📦 Preparing deployment package..."

# Create deployment directory
rm -rf .deploy
mkdir -p .deploy

# Copy frontend build
cp -r .next .deploy/
cp -r public .deploy/
cp package.json .deploy/
cp package-lock.json .deploy/
cp next.config.js .deploy/
cp -r src .deploy/  # Needed for SSR

# Copy backend
mkdir -p .deploy/backend
cp -r backend/dist .deploy/backend/
cp -r backend/prisma .deploy/backend/
cp backend/package.json .deploy/backend/
cp backend/package-lock.json .deploy/backend/
cp backend/.env.production .deploy/backend/.env

# Create deployment info
echo "{
  \"version\": \"$(date +%Y%m%d%H%M%S)\",
  \"deployedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"git_commit\": \"$(git rev-parse HEAD 2>/dev/null || echo 'unknown')\"
}" > .deploy/deployment.json

print_success "Deployment package prepared"

# Step 3: Create server setup script
echo ""
echo "📝 Creating server setup script..."

cat > .deploy/setup-server.sh << 'SETUP_SCRIPT'
#!/bin/bash

# Server Setup Script
set -e

echo "Setting up S4 Labs on server..."

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 18
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally
npm install -g pm2

# Install nginx
apt-get install -y nginx certbot python3-certbot-nginx

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib

# Install Redis
apt-get install -y redis-server

# Setup PostgreSQL
sudo -u postgres psql << EOF
CREATE USER s4labs WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE s4labs_prod OWNER s4labs;
GRANT ALL PRIVILEGES ON DATABASE s4labs_prod TO s4labs;
EOF

# Setup firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3000
ufw allow 4000
ufw --force enable

echo "Server setup complete!"
SETUP_SCRIPT

chmod +x .deploy/setup-server.sh

# Step 4: Create nginx configuration
echo ""
echo "📝 Creating nginx configuration..."

cat > .deploy/nginx-frontend.conf << NGINX_FRONTEND
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # SSL will be configured by certbot
    # ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_FRONTEND

cat > .deploy/nginx-backend.conf << NGINX_BACKEND
server {
    listen 80;
    listen [::]:80;
    server_name ${API_DOMAIN};

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${API_DOMAIN};

    # SSL will be configured by certbot
    # ssl_certificate /etc/letsencrypt/live/${API_DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${API_DOMAIN}/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS headers (handled by backend, but can add here too)
    add_header Access-Control-Allow-Origin "https://${DOMAIN}" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Handle preflight requests
    if (\$request_method = 'OPTIONS') {
        return 204;
    }

    # Proxy to backend API
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_BACKEND

# Step 5: Create PM2 ecosystem file
echo ""
echo "📝 Creating PM2 configuration..."

cat > .deploy/ecosystem.config.js << 'PM2_CONFIG'
module.exports = {
  apps: [
    {
      name: 's4labs-frontend',
      script: 'npm',
      args: 'run start:prod',
      cwd: '/var/www/s4labs',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/s4labs-frontend-error.log',
      out_file: '/var/log/pm2/s4labs-frontend-out.log',
      log_file: '/var/log/pm2/s4labs-frontend-combined.log',
      time: true
    },
    {
      name: 's4labs-backend',
      script: 'dist/index.js',
      cwd: '/var/www/s4labs/backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/var/log/pm2/s4labs-backend-error.log',
      out_file: '/var/log/pm2/s4labs-backend-out.log',
      log_file: '/var/log/pm2/s4labs-backend-combined.log',
      time: true
    }
  ]
};
PM2_CONFIG

# Step 6: Create deployment script for server
echo ""
echo "📝 Creating deployment script..."

cat > .deploy/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash

set -e

DEPLOY_PATH="/var/www/s4labs"
BACKUP_PATH="/var/backups/s4labs"

echo "Deploying S4 Labs..."

# Create backup
if [ -d "$DEPLOY_PATH" ]; then
    echo "Creating backup..."
    mkdir -p "$BACKUP_PATH"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    tar -czf "$BACKUP_PATH/backup_$TIMESTAMP.tar.gz" -C "$DEPLOY_PATH" .
    echo "Backup created: backup_$TIMESTAMP.tar.gz"
fi

# Create deployment directory
mkdir -p "$DEPLOY_PATH"

# Stop services
pm2 stop s4labs-frontend s4labs-backend || true

# Deploy files
echo "Deploying files..."
cp -r /tmp/s4labs-deploy/* "$DEPLOY_PATH/"

# Install dependencies
echo "Installing frontend dependencies..."
cd "$DEPLOY_PATH"
npm ci --production

echo "Installing backend dependencies..."
cd "$DEPLOY_PATH/backend"
npm ci --production

# Run database migrations
echo "Running database migrations..."
npx prisma generate
npx prisma db push

# Setup nginx if needed
if [ ! -f /etc/nginx/sites-enabled/s4labs-frontend ]; then
    cp /tmp/s4labs-deploy/nginx-frontend.conf /etc/nginx/sites-available/s4labs-frontend
    ln -s /etc/nginx/sites-available/s4labs-frontend /etc/nginx/sites-enabled/
fi

if [ ! -f /etc/nginx/sites-enabled/s4labs-backend ]; then
    cp /tmp/s4labs-deploy/nginx-backend.conf /etc/nginx/sites-available/s4labs-backend
    ln -s /etc/nginx/sites-available/s4labs-backend /etc/nginx/sites-enabled/
fi

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx

# Start services with PM2
cd "$DEPLOY_PATH"
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up SSL: certbot --nginx -d s4labs.xyz -d www.s4labs.xyz -d api.s4labs.xyz"
echo "2. Check services: pm2 status"
echo "3. View logs: pm2 logs"
DEPLOY_SCRIPT

chmod +x .deploy/deploy.sh

# Step 7: Create rsync deployment command
echo ""
echo "📝 Creating deployment command..."

cat > deploy-to-vps.sh << DEPLOY_COMMAND
#!/bin/bash

echo "Deploying to VPS at ${VPS_IP}..."

# Upload files
echo "Uploading files..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  .deploy/ ${VPS_USER}@${VPS_IP}:/tmp/s4labs-deploy/

# Run deployment script on server
echo "Running deployment on server..."
ssh ${VPS_USER}@${VPS_IP} 'bash /tmp/s4labs-deploy/deploy.sh'

echo "Deployment complete!"
echo ""
echo "Access your application at:"
echo "  Frontend: https://${DOMAIN}"
echo "  Backend API: https://${API_DOMAIN}"
echo ""
echo "Server management:"
echo "  SSH: ssh ${VPS_USER}@${VPS_IP}"
echo "  PM2 status: pm2 status"
echo "  PM2 logs: pm2 logs"
echo "  Nginx logs: tail -f /var/log/nginx/access.log"
DEPLOY_COMMAND

chmod +x deploy-to-vps.sh

print_success "Deployment scripts created"

# Step 8: Instructions
echo ""
echo "================================"
echo "📋 Deployment Instructions"
echo "================================"
echo ""
echo "1. First-time server setup:"
echo "   ssh ${VPS_USER}@${VPS_IP}"
echo "   Run the setup script: bash /tmp/s4labs-deploy/setup-server.sh"
echo ""
echo "2. Update environment variables:"
echo "   - Edit backend/.env.production with production values"
echo "   - Set strong passwords and secret keys"
echo "   - Add contract addresses after deployment"
echo ""
echo "3. Deploy to VPS:"
echo "   ./deploy-to-vps.sh"
echo ""
echo "4. Set up SSL certificates (on server):"
echo "   certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${API_DOMAIN}"
echo ""
echo "5. Configure DNS:"
echo "   A record: ${DOMAIN} -> ${VPS_IP}"
echo "   A record: www.${DOMAIN} -> ${VPS_IP}"
echo "   A record: ${API_DOMAIN} -> ${VPS_IP}"
echo ""
print_warning "Important: Update all passwords and secret keys in production!"
print_warning "Never commit .env files or private keys to version control!"