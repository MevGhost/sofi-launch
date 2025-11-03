# 🚀 S4 Labs Production Deployment Guide

## 📋 Pre-Deployment Checklist

### Critical Security Items ✅
- [ ] JWT_SECRET is set (minimum 32 characters)
- [ ] DATABASE_URL uses strong password
- [ ] PRIVATE_KEY is secured (if needed)
- [ ] ALLOWED_ORIGINS configured correctly
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Redis password set (if using Redis)

### Environment Configuration ✅
- [ ] NODE_ENV=production
- [ ] All required environment variables set
- [ ] Database migrations completed
- [ ] Smart contract addresses configured
- [ ] RPC endpoints configured (paid service recommended)

### Code Preparation ✅
- [ ] All TypeScript compiled successfully
- [ ] No console.log statements in production code
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Dependencies updated (npm update)

## 🛠 Production Optimizations Implemented

### 1. Security Enhancements
```typescript
✅ JWT secret validation with production fail-hard
✅ Enhanced WebSocket authentication and rate limiting
✅ Comprehensive input validation and sanitization
✅ SQL injection protection
✅ XSS protection
✅ CORS properly configured
✅ Helmet.js security headers
✅ IP-based blocking for excessive failures
✅ Request rate limiting per endpoint
```

### 2. Performance Optimizations
```typescript
✅ Database connection pooling with retry logic
✅ Query performance monitoring
✅ WebSocket memory management
✅ Winston logging with log rotation
✅ Request ID tracking for debugging
✅ Cluster mode support for multi-core
✅ Compression enabled
✅ Static file caching
```

### 3. Monitoring & Health
```typescript
✅ Comprehensive health check endpoints
✅ Prometheus metrics export
✅ System resource monitoring
✅ Application metrics tracking
✅ Error tracking and alerting
✅ Slow query detection
✅ Memory leak prevention
```

## 📦 Installation Steps

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis (optional but recommended)
sudo apt install -y redis-server

# Install nginx
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Database Setup
```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE s4labs_prod;
CREATE USER s4labs WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE s4labs_prod TO s4labs;
\q

# Update DATABASE_URL in .env.production
DATABASE_URL="postgresql://s4labs:YOUR_STRONG_PASSWORD@localhost:5432/s4labs_prod"
```

### 3. Redis Setup (Optional but Recommended)
```bash
# Configure Redis password
sudo nano /etc/redis/redis.conf
# Add: requirepass YOUR_REDIS_PASSWORD

# Restart Redis
sudo systemctl restart redis-server

# Update REDIS_URL in .env.production
REDIS_URL="redis://:YOUR_REDIS_PASSWORD@localhost:6379"
```

### 4. Application Deployment
```bash
# Clone repository
git clone https://github.com/your-org/s4labs.git
cd s4labs

# Install dependencies
npm ci --production=false
cd backend && npm ci --production=false

# Setup environment
cp backend/.env.production backend/.env
# Edit .env with production values

# Run database migrations
cd backend
npx prisma generate
npx prisma migrate deploy

# Build applications
cd /path/to/s4labs
npm run build:prod
cd backend && npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 5. Nginx Configuration
```nginx
# /etc/nginx/sites-available/s4labs
server {
    server_name s4labs.xyz www.s4labs.xyz;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /uploads {
        alias /path/to/s4labs/backend/uploads;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    listen 80;
}
```

### 6. SSL Setup
```bash
# Get SSL certificate
sudo certbot --nginx -d s4labs.xyz -d www.s4labs.xyz

# Auto-renewal
sudo certbot renew --dry-run
```

## 🔍 Post-Deployment Validation

### 1. Health Checks
```bash
# Basic health check
curl http://localhost:4000/health

# Detailed health check
curl http://localhost:4000/health/detailed

# Prometheus metrics
curl http://localhost:4000/metrics
```

### 2. PM2 Monitoring
```bash
# Check process status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Check cluster status
pm2 show s4labs-backend
```

### 3. Database Health
```bash
# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
sudo -u postgres psql -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### 4. Load Testing
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test API endpoint
ab -n 1000 -c 10 http://localhost:4000/api/stats

# Test WebSocket connections
npm install -g wscat
wscat -c ws://localhost:4000
```

## 📊 Monitoring Setup

### 1. Sentry Integration
```javascript
// Add to backend/.env.production
SENTRY_DSN=your_sentry_dsn_here

// Initialize in index.ts
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### 2. Uptime Monitoring
- Configure UptimeRobot or Pingdom
- Monitor endpoints:
  - https://s4labs.xyz/health
  - https://s4labs.xyz/api/health
  - WebSocket: wss://s4labs.xyz/ws

### 3. Log Aggregation
```bash
# PM2 log management
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
```

## 🚨 Emergency Procedures

### 1. High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart specific process
pm2 restart s4labs-backend

# Force garbage collection (if Node.js built with --expose-gc)
pm2 trigger s4labs-backend gc
```

### 2. Database Issues
```bash
# Check database connections
psql -U s4labs -d s4labs_prod -c "SELECT * FROM pg_stat_activity;"

# Kill hanging queries
psql -U s4labs -d s4labs_prod -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < NOW() - INTERVAL '5 minutes';"

# Restart database
sudo systemctl restart postgresql
```

### 3. Complete Restart
```bash
# Stop everything
pm2 stop all

# Clear logs if needed
pm2 flush

# Restart database
sudo systemctl restart postgresql
sudo systemctl restart redis-server

# Start application
pm2 start ecosystem.config.js --env production
```

## 📈 Performance Tuning

### 1. Node.js Optimization
```bash
# Increase memory limit in ecosystem.config.js
node_args: '--max-old-space-size=4096'

# Enable production optimizations
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"
```

### 2. PostgreSQL Tuning
```sql
-- /etc/postgresql/14/main/postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### 3. Nginx Optimization
```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 2048;
use epoll;
multi_accept on;

# Enable gzip
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

## 🔐 Security Best Practices

1. **Regular Updates**
   ```bash
   # Weekly security updates
   npm audit
   npm audit fix
   
   # System updates
   sudo apt update && sudo apt upgrade
   ```

2. **Backup Strategy**
   ```bash
   # Database backup
   pg_dump -U s4labs s4labs_prod > backup_$(date +%Y%m%d).sql
   
   # Automated backups with cron
   0 2 * * * pg_dump -U s4labs s4labs_prod | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
   ```

3. **Firewall Rules**
   ```bash
   # UFW firewall setup
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

## 📞 Support Contacts

- **DevOps Lead**: devops@s4labs.xyz
- **Security Team**: security@s4labs.xyz
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Escalation**: management@s4labs.xyz

## ✅ Final Verification

Run the production validation script:
```bash
cd /path/to/s4labs/backend
node scripts/validate-production.js
```

This will check:
- All environment variables are set
- Database connectivity
- Redis connectivity (if configured)
- API endpoints are responding
- WebSocket connections work
- Health checks pass
- No development code in production

---

**Last Updated**: 2025-08-24
**Version**: 1.0.0
**Status**: PRODUCTION READY