#!/bin/bash

# API Snapshot Verifier - Web Server Startup Script
# This script reads configuration from .env file and starts both backend and frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created from .env.example"
    else
        print_error ".env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Load environment variables from .env file
set -a
source .env
set +a

print_info "Starting API Snapshot Verifier Web Application..."
print_info "Backend: $PROTOCOL://$HOST:$PORT"
print_info "Frontend: http://localhost:$VITE_FRONTEND_PORT"
print_info "CORS Origins: $CORS_ORIGIN"

# Check if ports are available
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is already in use by another process"
        print_info "Attempting to free port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "Failed to free port $port. Please manually stop the process using this port."
            exit 1
        else
            print_success "Port $port freed successfully"
        fi
    fi
}

# Check backend port
check_port $PORT "Backend"

# Check frontend port
check_port $VITE_FRONTEND_PORT "Frontend"

# Build the application
print_info "Building application..."
npm run build

# Start the web application
print_info "Starting web servers..."
print_success "🚀 Starting servers with configuration:"
echo "   Backend:  $PROTOCOL://$HOST:$PORT"
echo "   Frontend: http://localhost:$VITE_FRONTEND_PORT"
echo "   API Docs: $PROTOCOL://$HOST:$PORT/api-docs"
echo ""
print_info "Press Ctrl+C to stop both servers"

# Export all environment variables for the child processes
export PORT HOST CONFIG_PATH LOG_LEVEL NODE_ENV CORS_ORIGIN ENABLE_RATE_LIMIT
export VITE_BACKEND_URL VITE_FRONTEND_PORT PROTOCOL

# Start both servers
npm run web