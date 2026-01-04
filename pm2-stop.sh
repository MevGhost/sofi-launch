#!/bin/bash

echo "Stopping S4Labs PM2 processes..."

# Stop all PM2 processes
npx pm2 stop all

# Delete all PM2 processes
npx pm2 delete all

echo "All PM2 processes stopped and deleted."