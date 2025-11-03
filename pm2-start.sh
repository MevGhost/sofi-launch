#!/bin/bash

echo "Starting S4Labs with PM2 (Development Mode)..."

# No build needed for dev mode
echo "Starting PM2 processes in development mode..."
npx pm2 start ecosystem.config.cjs

# Show status
npx pm2 status

echo "S4Labs started successfully in development mode!"
echo "To view logs: npx pm2 logs"
echo "To monitor: npx pm2 monit"
echo "To stop: ./pm2-stop.sh"