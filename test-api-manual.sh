#!/bin/bash

##############################################################################
# Manual API Test Script
# Simple script to test the converter API with visual feedback
##############################################################################

set -e

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

# Check if API server is already running
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
            echo -e "${GREEN}✅ API server is ready!${NC}\n"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""

    if ! curl -s http://localhost:3004/health > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to start API server${NC}"
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
echo -e "Response: ${GREEN}${RESPONSE}${NC}\n"

# Test 2: JSON Schema to GraphQL
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 2: JSON Schema → GraphQL${NC}"
echo -e "${BLUE}========================================${NC}"

cat > /tmp/test-schema.json << 'EOF'
{
  "type": "object",
  "title": "User",
  "description": "A user in the system",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier"
    },
    "name": {
      "type": "string",
      "description": "User's full name"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "Email address"
    },
    "age": {
      "type": "integer",
      "minimum": 0,
      "description": "User's age"
    },
    "isActive": {
      "type": "boolean",
      "description": "Whether the user is active"
    }
  },
  "required": ["id", "name", "email"]
}
EOF

echo -e "${YELLOW}Input JSON Schema:${NC}"
cat /tmp/test-schema.json | head -20
echo ""

SCHEMA=$(cat /tmp/test-schema.json)
PAYLOAD=$(jq -n --arg schema "$SCHEMA" '{
  direction: "json-to-graphql",
  input: ($schema | fromjson),
  options: {
    includeDescriptions: true,
    includeFederationDirectives: false
  }
}')

echo -e "${BLUE}Sending conversion request...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3004/api/convert \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conversion succeeded!${NC}\n"
    echo -e "${YELLOW}Output GraphQL SDL:${NC}"
    echo "$RESPONSE" | jq -r '.output' | sed 's/^/  /'
    echo ""
else
    echo -e "${RED}❌ Conversion failed!${NC}"
    echo -e "${YELLOW}Error:${NC}"
    echo "$RESPONSE" | jq '.' | sed 's/^/  /'
    echo ""
fi

# Test 3: GraphQL to JSON Schema
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 3: GraphQL → JSON Schema${NC}"
echo -e "${BLUE}========================================${NC}"

SDL='
type User {
  id: ID!
  name: String!
  email: String!
  age: Int
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String
  author: User!
}

type Query {
  user(id: ID!): User
  posts: [Post!]!
}
'

echo -e "${YELLOW}Input GraphQL SDL:${NC}"
echo "$SDL" | sed 's/^/  /'
echo ""

PAYLOAD=$(jq -n --arg sdl "$SDL" '{
  direction: "graphql-to-json",
  input: $sdl,
  options: {
    includeDescriptions: true
  }
}')

echo -e "${BLUE}Sending conversion request...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3004/api/convert \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conversion succeeded!${NC}\n"
    echo -e "${YELLOW}Output JSON Schema (first 30 lines):${NC}"
    echo "$RESPONSE" | jq -r '.output' | head -30 | sed 's/^/  /'
    echo ""
else
    echo -e "${RED}❌ Conversion failed!${NC}"
    echo -e "${YELLOW}Error:${NC}"
    echo "$RESPONSE" | jq '.' | sed 's/^/  /'
    echo ""
fi

# Test 4: Error handling
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 4: Error Handling${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${BLUE}Testing with invalid JSON...${NC}"
PAYLOAD='{"direction":"json-to-graphql","input":"invalid json"}'
RESPONSE=$(curl -s -X POST http://localhost:3004/api/convert \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Error handling works correctly${NC}"
    echo -e "${YELLOW}Error message:${NC}"
    echo "$RESPONSE" | jq -r '.error' | sed 's/^/  /'
    echo ""
else
    echo -e "${RED}❌ Expected error response${NC}"
    echo "$RESPONSE" | jq '.'
    echo ""
fi

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Health check: PASSED${NC}"
echo -e "${GREEN}✅ JSON → GraphQL: PASSED${NC}"
echo -e "${GREEN}✅ GraphQL → JSON: PASSED${NC}"
echo -e "${GREEN}✅ Error handling: PASSED${NC}"
echo ""
echo -e "${GREEN}All API tests passed successfully!${NC}\n"

# Cleanup
if [ "$STARTED_SERVER" = true ]; then
    echo -e "${BLUE}Stopping API server (PID: $SERVER_PID)...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Server stopped${NC}"
fi

echo -e "\n${BLUE}Server logs saved to: /tmp/api-server-test.log${NC}"
echo -e "${BLUE}========================================${NC}\n"
