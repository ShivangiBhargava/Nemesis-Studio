#!/usr/bin/env bash
# ========================================================
# Launch script for Nemesis Agent Studio
# ========================================================
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "======================================================="
echo "⚡ Starting Nemesis Agent Studio..."
echo "🚀 Nebius x NVIDIA Global AI Hackathon"
echo "======================================================="

# Check node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js v18+."
    exit 1
fi

# Install dependencies if node_modules missing
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

echo "🌐 Launching server on http://localhost:5050 ..."
node backend/server.js
