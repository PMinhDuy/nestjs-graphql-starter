#!/bin/bash

##############################################################################
# nestjs-graphql-starter Local Development Setup Script
#
# This script initializes the local development environment including:
# - System dependency checks
# - NPM dependencies installation
# - Environment variables setup
# - Local PostgreSQL & Redis initialization
# - Database migrations
#
# Usage: bash setup.sh
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
print_step() {
  echo -e "${BLUE}→${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

##############################################################################
# Step 1: Check System Dependencies
##############################################################################

print_step "Checking system dependencies..."

# Check Node.js
if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v)
print_success "Node.js: $NODE_VERSION"

# Check npm or pnpm
if command -v pnpm &> /dev/null; then
  PKG_MANAGER="pnpm"
  PKG_VERSION=$(pnpm -v)
elif command -v npm &> /dev/null; then
  PKG_MANAGER="npm"
  PKG_VERSION=$(npm -v)
else
  print_error "Neither npm nor pnpm is installed"
  exit 1
fi

print_success "Package Manager: $PKG_MANAGER $PKG_VERSION"

# Check Docker or OrbStack
if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version)
  print_success "Docker: $DOCKER_VERSION"
  CONTAINER_RUNTIME="docker"
elif command -v orbctl &> /dev/null; then
  ORBSTACK_VERSION=$(orbctl version 2>/dev/null || echo "OrbStack installed")
  print_success "OrbStack: $ORBSTACK_VERSION"
  CONTAINER_RUNTIME="orbstack"
else
  print_warning "Neither Docker nor OrbStack detected. You'll need to set up PostgreSQL & Redis manually."
  CONTAINER_RUNTIME="none"
fi

##############################################################################
# Step 2: Install Project Dependencies
##############################################################################

print_step "Installing project dependencies..."

if [ "$PKG_MANAGER" = "pnpm" ]; then
  pnpm install
else
  npm install
fi

print_success "Dependencies installed"

##############################################################################
# Step 3: Setup Environment Variables
##############################################################################

print_step "Setting up environment variables..."

if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    cp .env.example .env.local
    print_success "Created .env.local from .env.example"
    print_warning "Please review and update .env.local with your local settings"
  else
    print_error ".env.example not found"
    exit 1
  fi
else
  print_success ".env.local already exists"
fi

##############################################################################
# Step 4: Initialize Database (PostgreSQL & Redis)
##############################################################################

if [ "$CONTAINER_RUNTIME" != "none" ]; then
  print_step "Initializing local database services..."

  if [ "$CONTAINER_RUNTIME" = "orbstack" ] || [ "$CONTAINER_RUNTIME" = "docker" ]; then
    # Check if docker-compose.yml exists
    if [ ! -f docker-compose.yml ]; then
      print_error "docker-compose.yml not found"
      exit 1
    fi

    # Start services
    print_step "Starting PostgreSQL and Redis via docker-compose..."
    docker-compose up -d postgres redis

    # Wait for PostgreSQL to be ready
    print_step "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
      if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        print_success "PostgreSQL is ready"
        break
      fi
      if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start"
        exit 1
      fi
      sleep 1
    done

    # Wait for Redis to be ready
    print_step "Waiting for Redis to be ready..."
    for i in {1..30}; do
      if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        print_success "Redis is ready"
        break
      fi
      if [ $i -eq 30 ]; then
        print_error "Redis failed to start"
        exit 1
      fi
      sleep 1
    done
  fi
else
  print_warning "Database services not started (Docker/OrbStack not available)"
  print_warning "Please ensure PostgreSQL is running on localhost:5432 and Redis on localhost:6379"
fi

##############################################################################
# Step 5: Run Database Migrations
##############################################################################

print_step "Running database migrations..."

if [ "$PKG_MANAGER" = "pnpm" ]; then
  pnpm migration:run
else
  npm run migration:run
fi

print_success "Database migrations completed"

##############################################################################
# Step 6: Summary and Next Steps
##############################################################################

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Review environment variables:"
echo "   cat .env.local"
echo ""
echo "2. Start the development server:"
if [ "$PKG_MANAGER" = "pnpm" ]; then
  echo "   pnpm start:dev"
else
  echo "   npm run start:dev"
fi
echo ""
echo "3. Open GraphQL playground in your browser:"
echo "   http://localhost:3000/graphql"
echo ""
echo "Services running on:"
echo "   - API:        http://localhost:3000"
echo "   - GraphQL:    http://localhost:3000/graphql"
echo "   - PostgreSQL: localhost:5432 (User: postgres)"
echo "   - Redis:      localhost:6379"
echo ""
echo "Database name: nestjs_graphql"
echo ""
echo "To stop services, run:"
echo "   docker-compose down"
echo ""
