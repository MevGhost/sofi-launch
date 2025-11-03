#!/bin/bash

echo "Starting S4Labs with PM2 (Production Mode)..."

# Build frontend
echo "Building frontend for production..."
npm run build:prod

# Build backend
echo "Building backend for production..."
cd backend
npm run build
cd ..

# Start PM2 with production config
echo "Starting PM2 processes in production mode..."
npx pm2 start ecosystem.config.prod.cjs

# Show status
npx pm2 status

echo "S4Labs started successfully in production mode!"
echo "To view logs: npx pm2 logs"
echo "To monitor: npx pm2 monit"
echo "To stop: ./pm2-stop.sh"