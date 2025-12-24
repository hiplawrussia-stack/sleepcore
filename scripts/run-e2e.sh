#!/bin/bash

# Run E2E Tests
# ==============
# Starts API + Mini App and runs Playwright tests.

set -e

echo "🚀 Starting E2E test environment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    kill $API_PID 2>/dev/null || true
    kill $APP_PID 2>/dev/null || true
}

trap cleanup EXIT

# Start API
echo -e "${GREEN}Starting API server...${NC}"
cd api
DATABASE_PATH=:memory: JWT_SECRET=test-secret BOT_TOKEN=test:bot:token PORT=3001 npm run dev &
API_PID=$!
cd ..

# Wait for API
echo "Waiting for API to be ready..."
sleep 5

# Start Mini App
echo -e "${GREEN}Starting Mini App...${NC}"
cd mini-app
VITE_API_URL=http://localhost:3001 npm run dev &
APP_PID=$!
cd ..

# Wait for Mini App
echo "Waiting for Mini App to be ready..."
sleep 10

# Run E2E tests
echo -e "${GREEN}Running E2E tests...${NC}"
cd e2e
npm test -- --project=chromium

echo -e "${GREEN}✅ E2E tests completed!${NC}"
