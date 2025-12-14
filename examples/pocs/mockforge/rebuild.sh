#!/bin/bash
# Rebuild Docker images and restart services

set -e

echo "🔨 Rebuilding MockForge Docker images..."

# Build mock services
echo "📦 Building mock services..."
docker compose build contract_data-mock public_spending-mock legacy_procurement-mock intake_process-mock logistics_mgmt-mock

# Build GraphQL Mesh gateway
echo "🕸️  Building GraphQL Mesh gateway..."
docker compose build mesh-gateway

# Build Hive Gateway (The Guild's federation gateway)
echo "🚀 Building Hive Gateway..."
docker compose build hive-gateway

echo "✅ Rebuild complete!"
echo ""
echo "To restart services, run:"
echo "  docker compose down && docker compose up"
