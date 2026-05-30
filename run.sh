#!/bin/bash
# ============================================================
# run.sh — One-command pipeline runner
# Installs deps, then processes all 5 cameras sequentially
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================================"
echo "  OpticRetail Detection Pipeline"
echo "========================================================"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "[ERROR] Python 3 is required. Please install it first."
    exit 1
fi

# Install pipeline dependencies
echo "[1/3] Installing pipeline dependencies..."
pip install -r requirements.txt -q
echo "  ✓ Dependencies ready."
echo ""

# Check API is reachable
echo "[2/3] Checking API connectivity..."
API_URL=$(grep "API_INGEST_URL" .env | cut -d '=' -f2)
BASE_URL=$(echo "$API_URL" | sed 's|/events/ingest||')
if curl -sf "$BASE_URL/health" > /dev/null 2>&1; then
    echo "  ✓ API is online at $BASE_URL"
else
    echo "  ⚠ WARNING: API at $BASE_URL is not responding."
    echo "    Make sure the backend is running (docker-compose up or uvicorn main:app)"
    read -p "  Continue anyway? [y/N] " yn
    if [[ "$yn" != "y" && "$yn" != "Y" ]]; then
        exit 1
    fi
fi
echo ""

# Run the pipeline
echo "[3/3] Starting detection pipeline on all cameras..."
echo "  Processing: CAM1 (Main Floor A) → CAM2 (Main Floor B) → CAM3 (Entry) → CAM5 (Billing)"
echo "  Note: CAM4 (Storage) is excluded from customer analytics."
echo ""
python3 detect.py

echo ""
echo "========================================================"
echo "  Pipeline complete! Events have been sent to the API."
echo "  Open http://localhost:3000 to see the live dashboard."
echo "========================================================"
