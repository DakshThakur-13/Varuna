#!/bin/bash
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Varuna AI Agent Startup                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"

echo "[1/3] Checking Python environment..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.10+ from https://python.org"
    exit 1
fi

echo "[2/3] Installing dependencies..."
pip3 install -r requirements.txt --quiet

echo "[3/3] Starting AI Agent server..."
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Agent will start on http://localhost:8000"
echo "  API docs available at http://localhost:8000/docs"
echo "  Press Ctrl+C to stop"
echo "═══════════════════════════════════════════════════════════════"
echo ""

python3 main.py
