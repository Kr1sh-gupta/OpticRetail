#!/bin/bash
echo "========================================================"
echo "🧹 OpticRetail SRE Demo - Deep Cleanup Utility"
echo "========================================================"
echo ""
echo "[1/3] Bringing down all containers, networks, and attached volumes..."
docker-compose down -v --remove-orphans

echo ""
echo "[2/3] Removing the specific Docker images built for this demo..."
docker rmi opticretail-demo-frontend opticretail-demo-backend opticretail-demo-db opticretail-demo-lb -f

echo ""
echo "[3/3] Pruning any dangling builder cache..."
docker builder prune -f

echo ""
echo "========================================================"
echo "✅ Cleanup Complete! Your Docker environment is pristine."
echo "========================================================"
