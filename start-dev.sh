#!/bin/bash

echo "Starting S4 Labs Development Environment..."

# Kill any existing processes on our ports
echo "Clearing ports..."
lsof -ti:3000 | xargs -r kill -9 2>/dev/null
lsof -ti:5001 | xargs -r kill -9 2>/dev/null
sleep 2

# Start backend
echo "Starting backend on port 5001..."
cd /home/puwpl/Desktop/project/backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to be ready..."
sleep 5

# Start frontend
echo "Starting frontend on port 3000..."
cd /home/puwpl/Desktop/project
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ S4 Labs is starting up!"
echo "📦 Backend: http://localhost:5001 (PID: $BACKEND_PID)"
echo "🌐 Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Keep script running
wait