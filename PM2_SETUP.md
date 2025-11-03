# PM2 Setup for S4Labs

## Overview
PM2 is configured to manage both the frontend (Next.js) and backend (Express) applications for S4Labs in either development or production mode.

## Configuration Files
- `ecosystem.config.cjs` - Development mode PM2 configuration
- `ecosystem.config.prod.cjs` - Production mode PM2 configuration
- `pm2-start.sh` - Start services in development mode (no build)
- `pm2-start-prod.sh` - Build and start services in production mode
- `pm2-stop.sh` - Stop all services
- `pm2-restart.sh` - Restart services (prompts for dev/prod mode)
- `pm2-logs.sh` - View logs interactively

## Quick Start

### Development Mode (Default)
```bash
./pm2-start.sh
```
This will:
- Start both services in development mode with hot reload
- No build step required
- Uses `npm run dev` for both frontend and backend

### Production Mode
```bash
./pm2-start-prod.sh
```
This will:
- Build the frontend production bundle
- Build the backend TypeScript code
- Start both services with PM2 in production mode

### 2. Stop All Services
```bash
./pm2-stop.sh
```

### 3. Restart Services
```bash
./pm2-restart.sh
```
You'll be prompted whether to rebuild before restarting.

### 4. View Logs
```bash
./pm2-logs.sh
```
Choose from:
- All logs
- Frontend logs only
- Backend logs only
- Clear all logs

## PM2 Commands

### View Process Status
```bash
npx pm2 status
```

### Monitor Resources
```bash
npx pm2 monit
```

### View Logs in Real-time
```bash
npx pm2 logs
```

### Restart Specific Service
```bash
npx pm2 restart s4labs-frontend
npx pm2 restart s4labs-backend
```

### View Detailed Info
```bash
npx pm2 info s4labs-frontend
npx pm2 info s4labs-backend
```

### Save PM2 Process List
```bash
npx pm2 save
```

### Setup PM2 Startup Script (Optional)
To make PM2 start on system boot:
```bash
npx pm2 startup
# Follow the instructions provided
npx pm2 save
```

## Log Files
Logs are stored in the `logs/` directory:
- `frontend-error.log` - Frontend error logs
- `frontend-out.log` - Frontend output logs
- `frontend-combined.log` - Combined frontend logs
- `backend-error.log` - Backend error logs
- `backend-out.log` - Backend output logs
- `backend-combined.log` - Combined backend logs

## Environment Variables
The PM2 configuration sets:
- Frontend runs on port 3000
- Backend runs on port 5001
- NODE_ENV is set to 'production'

## Monitoring Dashboard
For advanced monitoring, you can use PM2's web dashboard:
```bash
npx pm2 web
```
This starts a web server on port 9615 with system metrics.

## Troubleshooting

### If services won't start:
1. Check logs: `npx pm2 logs`
2. Ensure builds are successful:
   ```bash
   npm run build:prod
   cd backend && npm run build
   ```
3. Check for port conflicts:
   ```bash
   lsof -i :3000
   lsof -i :5001
   ```

### If services crash:
1. Check error logs in `logs/` directory
2. Increase memory limit in `ecosystem.config.cjs` if needed
3. Check environment variables are set correctly

### Reset PM2:
```bash
npx pm2 kill
rm -rf ~/.pm2
```

## Production Deployment
For production deployment:
1. Ensure all environment variables are properly set
2. Run `npx pm2 save` to save the process list
3. Setup startup script with `npx pm2 startup`
4. Consider using PM2 cluster mode for the backend (update `exec_mode` to 'cluster' and set `instances` as needed)