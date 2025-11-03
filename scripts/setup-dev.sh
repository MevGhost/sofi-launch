#!/bin/bash

# Development Setup Script for S4 Labs
# This script sets up the complete development environment

set -e  # Exit on error

echo "🚀 Starting S4 Labs Development Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists docker; then
    print_warning "Docker is not installed. You'll need to install PostgreSQL and Redis manually."
fi

print_success "Prerequisites checked"

# Step 1: Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
npm install
print_success "Frontend dependencies installed"

# Step 2: Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..
print_success "Backend dependencies installed"

# Step 3: Setup environment files
echo ""
echo "🔧 Setting up environment files..."

# Check if .env.local exists for frontend
if [ ! -f .env.local ]; then
    print_info "Creating frontend .env.local from template..."
    cp .env.local .env.local.backup 2>/dev/null || true
    # .env.local already created by our previous steps
    print_success "Frontend .env.local created"
else
    print_info "Frontend .env.local already exists"
fi

# Check if backend .env exists
if [ ! -f backend/.env ]; then
    print_info "Creating backend .env from .env.development..."
    cp backend/.env.development backend/.env
    print_warning "Please update backend/.env with your actual values"
    print_success "Backend .env created"
else
    print_info "Backend .env already exists"
fi

# Step 4: Start Docker containers (if Docker is available)
if command_exists docker; then
    echo ""
    echo "🐳 Starting Docker containers..."
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    # Start containers
    docker-compose up -d
    
    # Wait for PostgreSQL to be ready
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
    
    # Check if containers are running
    if docker ps | grep -q s4labs-postgres; then
        print_success "PostgreSQL is running on port 5432"
    else
        print_error "PostgreSQL container failed to start"
    fi
    
    if docker ps | grep -q s4labs-redis; then
        print_success "Redis is running on port 6379"
    else
        print_warning "Redis container failed to start (optional)"
    fi
    
    if docker ps | grep -q s4labs-pgadmin; then
        print_success "pgAdmin is running on http://localhost:5050"
        print_info "pgAdmin login: admin@s4labs.xyz / admin_password"
    fi
else
    print_warning "Docker not found. Please install PostgreSQL and Redis manually:"
    print_info "  PostgreSQL: https://www.postgresql.org/download/"
    print_info "  Redis: https://redis.io/download"
    print_info "  Then update the connection strings in backend/.env"
fi

# Step 5: Run database migrations
echo ""
echo "🗄️ Setting up database..."
cd backend

# Generate Prisma client
print_info "Generating Prisma client..."
npm run db:generate

# Run migrations
print_info "Running database migrations..."
npm run db:push

# Seed database (optional)
read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Seeding database..."
    npm run db:seed
    print_success "Database seeded"
fi

cd ..
print_success "Database setup complete"

# Step 6: Compile backend TypeScript
echo ""
echo "🔨 Building backend..."
cd backend
npm run build
cd ..
print_success "Backend built"

# Step 7: Create start scripts
echo ""
echo "📝 Creating start scripts..."

# Create start-dev.sh
cat > start-dev.sh << 'EOF'
#!/bin/bash
# Start all development servers

echo "Starting S4 Labs development servers..."

# Function to cleanup on exit
cleanup() {
    echo "Shutting down servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start backend server
echo "Starting backend server on port 4000..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend server
echo "Starting frontend server on port 3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "S4 Labs Development Servers"
echo "================================"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:4000"
echo "pgAdmin:  http://localhost:5050"
echo "================================"
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
EOF

chmod +x start-dev.sh
print_success "Start script created: ./start-dev.sh"

# Step 8: Final instructions
echo ""
echo "================================"
echo "✅ Development Setup Complete!"
echo "================================"
echo ""
echo "To start the development servers:"
echo "  ./start-dev.sh"
echo ""
echo "Or start them separately:"
echo "  Frontend: npm run dev"
echo "  Backend:  cd backend && npm run dev"
echo ""
echo "Access points:"
echo "  Frontend:     http://localhost:3000"
echo "  Backend API:  http://localhost:4000"
echo "  pgAdmin:      http://localhost:5050"
echo ""
echo "Next steps:"
echo "  1. Update backend/.env with your private key for blockchain transactions"
echo "  2. Deploy smart contracts: cd backend && npx hardhat run scripts/deploy.js"
echo "  3. Update contract addresses in .env files"
echo ""
print_warning "Remember to never commit .env files to version control!"