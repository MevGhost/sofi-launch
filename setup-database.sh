#!/bin/bash

echo "🐘 PostgreSQL Database Setup for S4Labs"
echo "======================================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first:"
    echo "   sudo pacman -S postgresql"
    exit 1
fi

# Check if PostgreSQL service is running
if ! systemctl is-active --quiet postgresql; then
    echo "⚠️  PostgreSQL service is not running"
    read -p "Do you want to start it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        echo "✅ PostgreSQL service started"
    else
        echo "❌ Cannot continue without PostgreSQL running"
        exit 1
    fi
fi

echo "✅ PostgreSQL is running"

# Navigate to backend directory
cd backend || exit

# Check if database exists
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w tokenflow | wc -l)

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "📦 Creating tokenflow database..."
    sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
    sudo -u postgres psql -c "ALTER USER postgres WITH SUPERUSER;"
    sudo -u postgres psql -c "CREATE DATABASE tokenflow;"
    echo "✅ Database created"
else
    echo "✅ Database 'tokenflow' already exists"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Seed database
read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    npx prisma db seed
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "To start the application:"
echo "  ./pm2-start.sh        # Development mode"
echo "  ./pm2-start-prod.sh   # Production mode"
echo ""
echo "To view the database:"
echo "  cd backend && npx prisma studio"