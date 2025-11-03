# S4 Labs Complete Integration Guide

## 🎯 Overview

This guide documents the complete integration between the frontend and backend of S4 Labs, including all configuration, deployment, and operational procedures.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [API Integration](#api-integration)
4. [Smart Contract Integration](#smart-contract-integration)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

## 🏗 Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTS                              │
├─────────────────────────────────────────────────────────────┤
│  Web Browser (3000) │ Mobile Browser │ API Consumers         │
└──────────┬──────────────────┬───────────────┬───────────────┘
           │                  │               │
           ▼                  ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                      NGINX REVERSE PROXY                     │
├─────────────────────────────────────────────────────────────┤
│  s4labs.xyz (443)  │  api.s4labs.xyz (443)                  │
└──────────┬──────────────────┬───────────────────────────────┘
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│   FRONTEND       │  │   BACKEND API    │
├──────────────────┤  ├──────────────────┤
│  Next.js (3000)  │  │  Express (4000)  │
│  - Pages         │  │  - REST API      │
│  - Components    │  │  - WebSocket     │
│  - Hooks         │  │  - Auth          │
└──────────────────┘  └─────────┬────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
         ┌──────────────────┐  ┌──────────────────┐
         │   PostgreSQL     │  │   Redis Cache    │
         ├──────────────────┤  ├──────────────────┤
         │  - Users         │  │  - Sessions      │
         │  - Tokens        │  │  - API Cache     │
         │  - Escrows       │  │  - Rate Limits   │
         │  - Trades        │  └──────────────────┘
         └──────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │   Base L2        │
         ├──────────────────┤
         │  - Smart         │
         │    Contracts     │
         │  - Token Factory │
         │  - Bonding Curve │
         └──────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 | React framework with SSR |
| Backend | Express.js | REST API server |
| Database | PostgreSQL | Primary data storage |
| Cache | Redis | Session & API caching |
| ORM | Prisma | Database abstraction |
| Blockchain | Base L2 | Smart contract platform |
| Web3 | Ethers.js | Blockchain interaction |
| WebSocket | ws | Real-time updates |
| Auth | JWT | Token-based authentication |

## 🚀 Development Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (or manual PostgreSQL/Redis installation)
- Git

### Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd s4labs

# 2. Run the setup script
./scripts/setup-dev.sh

# 3. Start development servers
./start-dev.sh
```

### Manual Setup

#### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

#### 2. Environment Configuration

Frontend (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
```

Backend (`backend/.env`):
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://s4labs:password@localhost:5432/s4labs_dev
JWT_SECRET=dev-secret-change-in-production
ALLOWED_ORIGINS=http://localhost:3000
BASE_RPC_URL=https://mainnet.base.org
```

#### 3. Start Services

```bash
# Start Docker services
docker-compose up -d

# Run database migrations
cd backend
npm run db:generate
npm run db:push
npm run db:seed  # Optional: seed with test data

# Start backend
npm run dev

# In another terminal, start frontend
cd ..
npm run dev
```

### Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- pgAdmin: http://localhost:5050 (admin@s4labs.xyz / admin_password)

## 🔌 API Integration

### API Configuration

The frontend uses a centralized API configuration at `src/lib/api/config.ts`:

```typescript
// API endpoints are automatically prefixed with API_BASE_URL
import { API_ENDPOINTS, apiRequest, wsManager } from '@/lib/api/config';

// Example usage in a component
const response = await apiRequest(API_ENDPOINTS.tokens.list);
```

### Available API Endpoints

#### Authentication
- `POST /api/auth/login` - Web3 wallet login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/auth/nonce` - Get nonce for signing

#### Tokens (Launchpad)
- `GET /api/tokens` - List all tokens
- `POST /api/tokens/create` - Create new token
- `GET /api/tokens/:address` - Get token details
- `POST /api/tokens/buy` - Buy tokens
- `POST /api/tokens/sell` - Sell tokens
- `GET /api/tokens/:address/chart` - Price chart data
- `GET /api/tokens/:address/holders` - Token holders
- `GET /api/tokens/:address/trades` - Recent trades

#### Escrows
- `GET /api/escrows` - List escrows
- `POST /api/escrows` - Create escrow
- `GET /api/escrows/:id` - Get escrow details
- `PUT /api/escrows/:id` - Update escrow
- `POST /api/escrows/:id/milestones/:milestoneId/release` - Release milestone
- `POST /api/escrows/:id/dispute` - Raise dispute

#### Admin
- `GET /api/admin/dashboard` - Admin statistics
- `GET /api/admin/users` - Manage users
- `GET /api/admin/settings` - Platform settings

### WebSocket Events

Real-time updates are handled via WebSocket:

```javascript
import { wsManager, WS_EVENTS } from '@/lib/api/config';

// Connect to WebSocket
wsManager.connect();

// Subscribe to events
const unsubscribe = wsManager.on(WS_EVENTS.TOKEN_CREATED, (data) => {
  console.log('New token created:', data);
});

// Cleanup
unsubscribe();
```

Available events:
- `token:created` - New token deployed
- `token:trade` - Buy/sell executed
- `token:graduated` - Token graduated to Uniswap
- `escrow:created` - New escrow created
- `escrow:milestone:released` - Milestone released
- `escrow:completed` - Escrow completed

## 🔗 Smart Contract Integration

### Contract Deployment

```bash
cd backend

# Deploy to Base Sepolia (testnet)
npx hardhat run scripts/deploy.js --network base-sepolia

# Deploy to Base Mainnet
npx hardhat run scripts/deploy.js --network base-mainnet
```

### Update Contract Addresses

After deployment, update the addresses in environment files:

Frontend (`.env.local`):
```env
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_BONDING_CURVE_ADDRESS=0x...
NEXT_PUBLIC_GRADUATION_MANAGER_ADDRESS=0x...
```

Backend (`backend/.env`):
```env
TOKEN_FACTORY_ADDRESS=0x...
BONDING_CURVE_ADDRESS=0x...
GRADUATION_MANAGER_ADDRESS=0x...
ESCROW_FACTORY_ADDRESS=0x...
```

### Contract Interactions

The backend handles all contract interactions through the `contractService`:

```typescript
// backend/services/contract.service.ts
await contractService.deployToken({
  name: 'Token Name',
  symbol: 'TKN',
  totalSupply: '1000000000',
  bondingCurveType: 'constant',
  creator: userAddress
});
```

## 🚢 Production Deployment

### Server Requirements

- Ubuntu 20.04+ or similar Linux distribution
- 4GB+ RAM
- 50GB+ SSD
- Node.js 18+
- Nginx
- PostgreSQL 15+
- Redis
- SSL certificates (Let's Encrypt)

### Deployment Steps

#### 1. Initial Server Setup

```bash
# SSH to your VPS
ssh root@34.45.62.154

# Run the server setup script (from deployment package)
bash /tmp/s4labs-deploy/setup-server.sh
```

#### 2. Configure DNS

Add these DNS records to your domain:
- A record: `s4labs.xyz` → `34.45.62.154`
- A record: `www.s4labs.xyz` → `34.45.62.154`
- A record: `api.s4labs.xyz` → `34.45.62.154`

#### 3. Deploy Application

```bash
# On your local machine
./scripts/deploy-production.sh
./deploy-to-vps.sh
```

#### 4. Setup SSL

```bash
# On the server
certbot --nginx -d s4labs.xyz -d www.s4labs.xyz -d api.s4labs.xyz
```

#### 5. Configure Production Environment

Update `backend/.env` on the server with production values:
```env
NODE_ENV=production
DATABASE_URL=postgresql://s4labs:STRONG_PASSWORD@localhost:5432/s4labs_prod
JWT_SECRET=GENERATE_64_CHAR_RANDOM_STRING
PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY
```

### PM2 Process Management

```bash
# View process status
pm2 status

# View logs
pm2 logs s4labs-frontend
pm2 logs s4labs-backend

# Restart services
pm2 restart s4labs-frontend
pm2 restart s4labs-backend

# Monitor resources
pm2 monit
```

## 📊 Monitoring & Maintenance

### Health Checks

- Frontend: https://s4labs.xyz
- Backend API: https://api.s4labs.xyz/health
- Database: `pg_isready -h localhost -U s4labs`
- Redis: `redis-cli ping`

### Log Files

```bash
# Application logs
/var/log/pm2/s4labs-frontend-*.log
/var/log/pm2/s4labs-backend-*.log

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# PostgreSQL logs
/var/log/postgresql/postgresql-*.log
```

### Database Backup

```bash
# Create backup
pg_dump -U s4labs s4labs_prod > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U s4labs s4labs_prod < backup_20240101.sql
```

### Updates & Maintenance

```bash
# Update application
git pull origin main
./deploy-to-vps.sh

# Update dependencies
npm update
cd backend && npm update

# Database migrations
cd backend
npx prisma migrate deploy
```

## 🔧 Troubleshooting

### Common Issues

#### Frontend can't connect to backend

1. Check backend is running: `pm2 status`
2. Check CORS settings in backend `.env`
3. Verify `NEXT_PUBLIC_API_URL` in frontend
4. Check nginx configuration

#### Database connection errors

1. Check PostgreSQL is running: `systemctl status postgresql`
2. Verify `DATABASE_URL` in backend `.env`
3. Check database exists: `psql -U s4labs -l`
4. Review connection pool settings

#### WebSocket connection fails

1. Check nginx WebSocket proxy configuration
2. Verify `NEXT_PUBLIC_WS_URL` in frontend
3. Check firewall allows WebSocket connections
4. Review PM2 cluster mode settings

#### Smart contract errors

1. Verify contract addresses in `.env` files
2. Check wallet has sufficient ETH for gas
3. Verify RPC endpoint is working
4. Review contract deployment logs

### Debug Commands

```bash
# Check service status
systemctl status nginx
systemctl status postgresql
systemctl status redis

# View recent errors
journalctl -u nginx -n 50
pm2 logs --err --lines 100

# Test database connection
psql -U s4labs -d s4labs_prod -c "SELECT 1"

# Test Redis connection
redis-cli ping

# Check disk space
df -h

# Check memory usage
free -m

# Check network connections
netstat -tlnp
```

## 📝 Development Workflow

### Feature Development

1. Create feature branch: `git checkout -b feature/new-feature`
2. Implement changes in frontend/backend
3. Test locally with `./start-dev.sh`
4. Run tests: `npm test`
5. Build production: `npm run build`
6. Create PR for review

### Database Changes

1. Modify Prisma schema: `backend/prisma/schema.prisma`
2. Generate migration: `npx prisma migrate dev --name migration_name`
3. Update TypeScript types: `npx prisma generate`
4. Test migration locally
5. Deploy to production: `npx prisma migrate deploy`

### Smart Contract Updates

1. Modify contracts in `backend/contracts/`
2. Run tests: `npx hardhat test`
3. Deploy to testnet first
4. Verify on Basescan
5. Update addresses in `.env` files
6. Deploy to mainnet

## 🔐 Security Considerations

### Environment Variables

- Never commit `.env` files
- Use strong, unique passwords
- Rotate JWT secrets regularly
- Keep private keys in secure storage

### API Security

- Rate limiting enabled
- CORS properly configured
- Input validation on all endpoints
- SQL injection protection via Prisma
- XSS protection headers

### Smart Contract Security

- Contracts audited before mainnet
- Multi-sig for admin functions
- Emergency pause functionality
- Slippage protection
- Reentrancy guards

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Base Documentation](https://docs.base.org)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)

## 🆘 Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Search existing GitHub issues
4. Create new issue with details

---

Last Updated: 2024
Version: 1.0.0