# Environment Variables Setup Guide

## Frontend Environment Variables (.env.local)

### Required Variables

```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000    # Backend API URL (use production URL in prod)
NEXT_PUBLIC_WS_URL=ws://localhost:4000       # WebSocket URL (use wss:// in production)

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=8453                    # Base Mainnet Chain ID
NEXT_PUBLIC_CHAIN_NAME=Base                  # Chain Name
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org # RPC URL

# Smart Contract Addresses (Deploy contracts first)
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0x...      # Token Factory Contract
NEXT_PUBLIC_BONDING_CURVE_ADDRESS=0x...      # Bonding Curve Implementation
NEXT_PUBLIC_GRADUATION_MANAGER_ADDRESS=0x... # Graduation Manager Contract
NEXT_PUBLIC_TREASURY_ADDRESS=0x...           # Treasury Address

# WalletConnect Configuration (Required)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=        # Get from https://cloud.walletconnect.com

# Alchemy Configuration (Required for better RPC)
NEXT_PUBLIC_ALCHEMY_ID=                      # Get from https://www.alchemy.com
```

### Optional Variables

```env
# Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=s4labs.xyz      # Plausible Analytics Domain
NEXT_PUBLIC_SENTRY_DSN=                      # Sentry Error Tracking

# Development
NEXT_PUBLIC_ENABLE_TESTNETS=false            # Enable testnet chains
```

## Backend Environment Variables (.env)

### Required Variables

```env
# Server Configuration
NODE_ENV=development                         # or 'production'
PORT=4000                                     # Server port
BASE_URL=http://localhost:4000               # Full base URL

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/s4labs

# Redis Cache
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Blockchain RPC
ETH_RPC_URL=https://mainnet.base.org
ALCHEMY_API_KEY=your-alchemy-key

# Smart Contracts (same as frontend)
TOKEN_FACTORY_ADDRESS=0x...
TREASURY_ADDRESS=0x...
```

### Optional Variables

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000                  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100                  # Max requests per window

# File Upload
MAX_FILE_SIZE=5242880                         # 5MB in bytes
UPLOAD_PATH=./uploads                         # Upload directory

# Monitoring
SENTRY_DSN=                                   # Sentry DSN for error tracking
LOG_LEVEL=info                                # winston log level
```

## Production Setup

### 1. Frontend Production (.env.production)

```env
# Use production URLs
NEXT_PUBLIC_API_URL=https://api.s4labs.xyz
NEXT_PUBLIC_WS_URL=wss://api.s4labs.xyz

# Use mainnet contracts
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Real project IDs
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-real-project-id
NEXT_PUBLIC_ALCHEMY_ID=your-real-alchemy-id
```

### 2. Backend Production (.env.production)

```env
NODE_ENV=production
PORT=4000
BASE_URL=https://api.s4labs.xyz

# Use production database
DATABASE_URL=postgresql://prod_user:prod_pass@prod-db:5432/s4labs_prod

# Production Redis
REDIS_URL=redis://prod-redis:6379

# Strong JWT secret
JWT_SECRET=generate-strong-random-secret-here

# Production CORS
ALLOWED_ORIGINS=https://s4labs.xyz,https://www.s4labs.xyz

# Production RPC with failover
ETH_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
FALLBACK_RPC_URL=https://mainnet.base.org
```

## Getting Required API Keys

### 1. WalletConnect Project ID
1. Go to https://cloud.walletconnect.com
2. Sign up/login
3. Create a new project
4. Copy the Project ID
5. Add to `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### 2. Alchemy API Key
1. Go to https://www.alchemy.com
2. Sign up/login
3. Create a new app (select Base network)
4. Copy the API key
5. Add to `NEXT_PUBLIC_ALCHEMY_ID` and `ALCHEMY_API_KEY`

### 3. Deploy Smart Contracts
1. Deploy the contracts to Base mainnet/testnet
2. Copy the deployed addresses
3. Add to all `*_ADDRESS` environment variables

## Docker Setup

For Docker deployments, use environment files:

```bash
# Frontend
docker run --env-file .env.production frontend-image

# Backend
docker run --env-file backend.env backend-image
```

## Security Best Practices

1. **Never commit .env files to git**
   - Add to .gitignore
   - Use .env.example files for templates

2. **Use different secrets for each environment**
   - Different JWT secrets for dev/staging/prod
   - Different database credentials

3. **Rotate secrets regularly**
   - Change JWT_SECRET periodically
   - Update API keys if compromised

4. **Use environment-specific configs**
   - Development: relaxed CORS, verbose logging
   - Production: strict CORS, minimal logging

5. **Secure storage in production**
   - Use AWS Secrets Manager
   - Or Kubernetes Secrets
   - Or HashiCorp Vault

## Troubleshooting

### Frontend Issues

**Problem**: WalletConnect not working
**Solution**: Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly

**Problem**: Can't connect to backend
**Solution**: Check `NEXT_PUBLIC_API_URL` matches backend URL and CORS settings

### Backend Issues

**Problem**: Database connection failed
**Solution**: Check `DATABASE_URL` format and database is running

**Problem**: WebSocket not connecting
**Solution**: Ensure WebSocket port is not blocked by firewall

**Problem**: File uploads failing
**Solution**: Check `uploads` directory exists and has write permissions

## Deployment Checklist

- [ ] All required environment variables set
- [ ] Production URLs configured
- [ ] Smart contracts deployed and addresses added
- [ ] API keys obtained and added
- [ ] JWT secret is strong and unique
- [ ] CORS origins match production domain
- [ ] Database is production-ready
- [ ] Redis cache is configured
- [ ] SSL certificates configured (for HTTPS/WSS)
- [ ] Environment files are secured and not in git