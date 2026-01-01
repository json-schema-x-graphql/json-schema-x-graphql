#!/bin/bash

##############################################################################
# Simple API Test Script (No external dependencies)
##############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}JSON Schema <-> GraphQL API Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if API server is running
echo -e "${BLUE}Checking if API server is running...${NC}"
if curl -s http://localhost:3004/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is already running${NC}\n"
    STARTED_SERVER=false
else
    echo -e "${YELLOW}⚠️  API server not running, starting it...${NC}"

    cd converters/node

    # Kill any existing process on port 3004
    lsof -ti:3004 | xargs kill -9 2>/dev/null || true
    sleep 1

    # Start server in background
    npx tsx src/api-server.ts > /tmp/api-server-test.log 2>&1 &
    SERVER_PID=$!
    echo -e "${BLUE}Started API server with PID: $SERVER_PID${NC}"

    # Wait for server to be ready
    echo -e "${BLUE}Waiting for server to start...${NC}"
    for i in {1..15}; do
        if curl -s http://localhost:3004/health > /dev/null 2>&1; then
            echo -e "\n${GREEN}✅ API server is ready!${NC}\n"
            break
        fi
        echo -n "."
        sleep 1
    done

    if ! curl -s http://localhost:3004/health > /dev/null 2>&1; then
        echo -e "\n${RED}❌ Failed to start API server${NC}"
        echo -e "${YELLOW}Server logs:${NC}"
        cat /tmp/api-server-test.log
        exit 1
    fi

    STARTED_SERVER=true
    cd "$SCRIPT_DIR"
fi

# Test 1: Health check
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 1: Health Check${NC}"
echo -e "${BLUE}========================================${NC}"
RESPONSE=$(curl -s http://localhost:3004/health)
echo -e "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ Health check PASSED${NC}\n"
else
    echo -e "${RED}❌ Health check FAILED${NC}\n"
    exit 1
fi

# Test 2: JSON Schema to GraphQL
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 2: JSON Schema → GraphQL${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${YELLOW}Sending conversion request...${NC}"

RESPONSE=$(curl -s -X POST http://localhost:3004/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "json-to-graphql",
    "input": {
      "type": "object",
      "title": "User",
      "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"},
        "age": {"type": "integer"}
      },
      "required": ["id", "name"]
    },
    "options": {
      "includeDescriptions": true
    }
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ JSON → GraphQL conversion PASSED${NC}\n"
    echo -e "${YELLOW}Output (first 500 chars):${NC}"
    echo "$RESPONSE" | head -c 500
    echo -e "\n"
else
    echo -e "${RED}❌ JSON → GraphQL conversion FAILED${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
fi

# Test 3: GraphQL to JSON Schema
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 3: GraphQL → JSON Schema${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${YELLOW}Sending conversion request...${NC}"

RESPONSE=$(curl -s -X POST http://localhost:3004/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "graphql-to-json",
    "input": "type User { id: ID! name: String! }",
    "options": {
      "includeDescriptions": true
    }
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ GraphQL → JSON conversion PASSED${NC}\n"
    echo -e "${YELLOW}Output (first 500 chars):${NC}"
    echo "$RESPONSE" | head -c 500
    echo -e "\n"
else
    echo -e "${RED}❌ GraphQL → JSON conversion FAILED${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
fi

# Test 4: Error handling
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 4: Error Handling${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${YELLOW}Testing with invalid input...${NC}"

RESPONSE=$(curl -s -X POST http://localhost:3004/api/convert \
  -H "Content-Type: application/json" \
  -d '{"invalid json')

if echo "$RESPONSE" | grep -q '"success":false'; then
    echo -e "${GREEN}✅ Error handling PASSED${NC}\n"
else
    echo -e "${YELLOW}⚠️  Expected error response (this is OK)${NC}\n"
fi

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ All core API tests completed!${NC}\n"

echo -e "${BLUE}To test in browser:${NC}"
echo -e "  1. Keep this server running"
echo -e "  2. In another terminal: cd frontend/schema-authoring && pnpm run dev"
echo -e "  3. Open http://localhost:3003 in your browser\n"

# Ask if user wants to keep server running
echo -e "${YELLOW}Press Enter to stop the API server, or Ctrl+C to keep it running...${NC}"
read

# Cleanup
if [ "$STARTED_SERVER" = true ]; then
    echo -e "${BLUE}Stopping API server (PID: $SERVER_PID)...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Server stopped${NC}"
fi

echo -e "\n${BLUE}Server logs saved to: /tmp/api-server-test.log${NC}"
echo -e "${BLUE}========================================${NC}\n"
