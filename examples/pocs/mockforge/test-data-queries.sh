#!/bin/bash

echo "=== Testing MockForge with Data Queries ==="
echo ""

# Test 1: Contract Data - Query records list
echo "1. Testing Contract Data Mock - Query contract_dataRecords..."
curl -s http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ contract_dataRecords { identifiers { piid agencyCode } agency { contractingAgencyName departmentName } } }"
  }' | jq
echo ""

# Test 2: Public Spending - Query procurements list
echo "2. Testing Public Spending Mock - Query public_spendingProcurements..."
curl -s http://localhost:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ public_spendingProcurements { piid uniqueAwardKey } }"
  }' | jq
echo ""

# Test 3: Legacy Procurement - Query legacy_procurement records
echo "3. Testing Legacy Procurement Mock - Query legacy_procurementRecords..."
curl -s http://localhost:4003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ legacy_procurementRecords { iaPiidOrUniqueId systemMetadata { sourceRecordId } } }"
  }' | jq
echo ""

# Test 4: Intake Process - Query intake_process records
echo "4. Testing Intake Process Mock - Query intake_processRecords..."
curl -s http://localhost:4004/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ intake_processRecords { businessOwner systemOwner } }"
  }' | jq
echo ""

# Test 5: Logistics Mgmt - Check if it has any queries (library-only)
echo "5. Testing Logistics Mgmt Mock - Query available fields..."
curl -s http://localhost:4005/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ __schema { queryType { fields { name } } } }"
  }' | jq
echo ""

# Test 6: Hive Gateway - Query through federation (simpler test first)
echo "6. Testing Hive Gateway - Simple federated query..."
curl -s http://localhost:5100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ intake_processRecords { businessOwner systemOwner } }"
  }' | jq
echo ""

# Test 6b: Hive Gateway - Test nested supergraph to subgraph query
echo "6b. Testing Hive Gateway - Nested cross-subgraph query..."
curl -s http://localhost:5100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ contract_dataRecords { identifiers { piid } systemMetadata { systemName } agency { contractingAgencyName } } public_spendingProcurements { piid uniqueAwardKey } }"
  }' | jq
echo ""

# Test 7: GraphQL Mesh - Query through federation
echo "7. Testing GraphQL Mesh - Federated query..."
curl -s http://localhost:5050/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ intake_processRecords { businessOwner systemOwner } }"
  }' | jq
echo ""

# Test 8: Cross-subgraph federation test with shared types
echo "8. Testing Federation - Query with potentially shared types..."
curl -s http://localhost:5100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ __schema { queryType { fields { name type { name kind } } } } }"
  }' | jq '.data.__schema.queryType.fields[] | select(.name | startswith("_") | not) | {name, returnType: .type.name}'
echo ""

echo "=== Data Query Tests Complete ==="
