#!/bin/bash

echo "Restarting S4Labs PM2 processes..."

# Check which mode
read -p "Restart in (d)evelopment or (p)roduction mode? " -n 1 -r
echo

if [[ $REPLY =~ ^[Pp]$ ]]
then
    # Production mode
    echo "Restarting in production mode..."
    
    # Rebuild for production
    echo "Building frontend..."
    npm run build:prod
    
    echo "Building backend..."
    cd backend
    npm run build
    cd ..
    
    # Restart with production config
    npx pm2 delete all
    npx pm2 start ecosystem.config.prod.cjs
else
    # Development mode
    echo "Restarting in development mode..."
    
    # No build needed for dev
    npx pm2 restart ecosystem.config.cjs
fi

# Show status
npx pm2 status

echo "S4Labs restarted successfully!"