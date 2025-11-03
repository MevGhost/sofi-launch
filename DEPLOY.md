# S4 Labs Deployment Instructions

## Quick Deploy

```bash
# 1. Upload and extract archive
tar -xzf s4labs-deployment.tar.gz
cd lets-bonk

# 2. Install dependencies (including dev dependencies for build)
npm ci --production=false

# 3. Copy and configure environment variables
cp .env.example .env
# Edit .env with your production values

# 4. Build the application
npm run build

# 5. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 6. Check status
pm2 status
pm2 logs s4labs
```

## Environment Variables Required

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN for error tracking
- `SENTRY_AUTH_TOKEN` - For source map uploads
- `SENTRY_ORG` - Your Sentry organization
- `SENTRY_PROJECT` - Your Sentry project name

## Ports

- Application runs on port 3000 by default
- Configure nginx/Apache to proxy to localhost:3000

## Verified Dependencies

All required dependencies are included in package.json:
- lucide-react
- pino-pretty
- All other production dependencies

## Notes

- The archive excludes node_modules, .next, and .git directories
- Build process will generate .next directory
- Sentry is configured for German region (de.sentry.io)
- Plausible analytics configured for s4labs.xyz domain