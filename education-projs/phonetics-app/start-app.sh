#!/bin/bash

# Phonetics Learning App - Complete Start Script
# This script starts both the backend API and frontend servers

set -e

APP_DIR="/mnt/c/Users/harri/designProject2020/education-projs/phonetics-app"
BACKEND_DIR="$APP_DIR/backend"

echo "🚀 Starting Phonetics Learning App..."
echo ""

# Kill any existing processes on ports 8000 and 3000
echo "🔧 Cleaning up existing processes..."
pkill -f "uvicorn.*8000" 2>/dev/null || true
pkill -f "http.server.*3000" 2>/dev/null || true
sleep 1

# Start Backend API Server
echo "📡 Starting Backend API Server (Port 8000)..."
cd "$BACKEND_DIR"
uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Start Frontend HTTP Server
echo "🌐 Starting Frontend Server (Port 3000)..."
cd "$APP_DIR"
python3 -m http.server 3000 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

# Wait for servers to start
echo ""
echo "⏳ Waiting for servers to initialize..."
sleep 3

# Verify both servers are running
echo ""
echo "🔍 Verifying servers..."
if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo "✓ Backend API: Running on http://localhost:8000"
else
    echo "✗ Backend API: Failed to start"
    exit 1
fi

if curl -s -I http://localhost:3000/ > /dev/null 2>&1; then
    echo "✓ Frontend: Running on http://localhost:3000"
else
    echo "✗ Frontend: Failed to start"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🎉 Phonetics Learning App is Ready!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📱 Open your browser and go to: http://localhost:3000"
echo ""
echo "📚 Available endpoints:"
echo "  • http://localhost:3000           - Main Learning App"
echo "  • http://localhost:3000/admin.html - Admin Dashboard"
echo "  • http://localhost:8000/docs      - API Documentation"
echo ""
echo "🛑 To stop the app, press Ctrl+C"
echo "════════════════════════════════════════════════════════════"
echo ""

# Keep the script running
wait
source venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

# Test services
echo ""
echo "Testing services..."
echo ""

# Test web server
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Web Server: Running on http://localhost:3000"
else
    echo "❌ Web Server: NOT responding"
fi

# Test backend
if curl -s http://localhost:8000/api/lesson > /dev/null 2>&1; then
    echo "✅ Backend API: Running on http://localhost:8000"
    PHONEME=$(curl -s http://localhost:8000/api/lesson | jq -r '.phoneme' 2>/dev/null || echo "unknown")
    echo "   Sample lesson: $PHONEME"
else
    echo "❌ Backend API: NOT responding"
fi

# Test audio endpoint
echo ""
echo "Testing audio endpoint..."
AUDIO_SIZE=$(curl -s http://localhost:8000/api/audio/p 2>/dev/null | wc -c)
if [ "$AUDIO_SIZE" -gt 1000 ]; then
    echo "✅ Audio Endpoint: Working (${AUDIO_SIZE} bytes)"
else
    echo "❌ Audio Endpoint: NOT working or too small (${AUDIO_SIZE} bytes)"
fi

echo ""
echo "═════════════════════════════════════════════"
echo "✨ App is ready!"
echo "═════════════════════════════════════════════"
echo ""
echo "📱 Open your browser to: http://localhost:3000"
echo ""
echo "To test:"
echo "  1. Click 'Get Lesson'"
echo "  2. Click 'Play & Animate'"
echo "  3. You should hear voice + see mouth animation"
echo ""
echo "Troubleshooting:"
echo "  - Check web logs: tail -f /tmp/web.log"
echo "  - Check backend logs: tail -f /tmp/backend.log"
echo ""
echo "Web PID: $WEB_PID"
echo "Backend PID: $BACKEND_PID"
