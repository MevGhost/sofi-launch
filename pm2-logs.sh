#!/bin/bash

# Script to view PM2 logs

echo "S4Labs PM2 Logs Viewer"
echo "====================="
echo ""
echo "1. View all logs"
echo "2. View frontend logs only"
echo "3. View backend logs only"
echo "4. Clear all logs"
echo ""
read -p "Select option (1-4): " option

case $option in
    1)
        npx pm2 logs
        ;;
    2)
        npx pm2 logs s4labs-frontend
        ;;
    3)
        npx pm2 logs s4labs-backend
        ;;
    4)
        npx pm2 flush
        echo "All logs cleared."
        ;;
    *)
        echo "Invalid option"
        ;;
esac