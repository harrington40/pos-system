#!/bin/bash
# Smart SIP Platform - Web App Startup Script
# Usage: ./start-web-wsl.sh

echo "🚀 Starting Smart SIP Web Application..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get the script directory (project root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📂 Project Directory: $SCRIPT_DIR"
echo ""

# Navigate to web app directory
WEB_DIR="$SCRIPT_DIR/apps/web"

if [ ! -d "$WEB_DIR" ]; then
    echo "❌ Error: Web app directory not found at $WEB_DIR"
    exit 1
fi

cd "$WEB_DIR"
echo "📂 Web App Directory: $WEB_DIR"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (first time setup)..."
    npm install
    echo ""
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ NPM: $(npm --version)"
echo ""

echo "🔥 Starting Vite development server..."
echo "🌐 Web UI will be available at: http://localhost:5173"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the dev server
npm run dev
