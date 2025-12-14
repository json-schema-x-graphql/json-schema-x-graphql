#!/bin/bash

echo "=== Testing MockForge Federation Stack ==="
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 5
echo ""

# Test 0: Check what queries are actually available
echo "0. Checking available queries on each service..."
for port in 4001 4002 4003 4004 4005; do
  echo "  Port $port ($(curl -s http://localhost:$port/healthz 2>/dev/null || echo 'checking...')):"
  result=$(curl -s http://localhost:$port/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __schema { queryType { fields { name } } } }"}' 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo "$result" | jq -r '.data.__schema.queryType.fields[].name' 2>/dev/null | head -5 || echo "    Error: $result"
  else
    echo "    Service not responding"
  fi
done
echo ""

# Test 1: Legacy Procurement Mock - Simple introspection first
echo "1. Testing Legacy Procurement Mock Service (port 4003) - Simple query..."
result=$(curl -s http://localhost:4003/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' 2>/dev/null)
echo "Response: $result"
echo ""

# Test 2: Intake Process Mock - Simple introspection
echo "2. Testing Intake Process Mock Service (port 4004) - Simple query..."
result=$(curl -s http://localhost:4004/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' 2>/dev/null)
echo "Response: $result"
echo ""

# Test 3: Hive Gateway - Check if it's running
echo "3. Testing Hive Gateway (port 5100) - Simple query..."
result=$(curl -s http://localhost:5100/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' 2>/dev/null)
echo "Response: $result"
echo ""

# Test 4: GraphQL Mesh - Check if it's running
echo "4. Testing GraphQL Mesh (port 5050) - Simple query..."
result=$(curl -s http://localhost:5050/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' 2>/dev/null)
echo "Response: $result"
echo ""

echo "=== Tests Complete ==="
