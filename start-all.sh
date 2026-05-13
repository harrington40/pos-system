#!/bin/bash
# Start both backend and frontend, or restart backend only with --backend flag
# Usage:
#   ./start-all.sh           — Start both backend + frontend
#   ./start-all.sh --backend — Restart backend only (kills old, starts fresh)

BACKEND_PORT=5001

# ── Backend-only restart ──────────────────────────────────────────────
if [ "$1" == "--backend" ]; then
  echo "🧹 Killing ALL nodemon and node server.js processes..."
  pkill -f "nodemon.*server.js" 2>/dev/null || true
  pkill -f "node.*server.js" 2>/dev/null || true
  sleep 1

  PID=$(lsof -ti tcp:$BACKEND_PORT)
  if [ ! -z "$PID" ]; then
    echo "⚠️  Port $BACKEND_PORT still in use by PID $PID – force killing..."
    kill -9 $PID 2>/dev/null || true
  fi

  echo "✅ All clear. Starting backend on port $BACKEND_PORT..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  cd "$SCRIPT_DIR/backend"
  PORT=$BACKEND_PORT npx nodemon server.js
  exit $?
fi

# ── Full start (both backend + frontend) ──────────────────────────────
echo "🧹 Cleaning up ports..."
for PORT in 5000 $BACKEND_PORT 8081 19000 19001; do
  PID=$(lsof -ti tcp:$PORT)
  if [ ! -z "$PID" ]; then
    echo "⚠️  Port $PORT in use by PID $PID – killing..."
    kill -9 $PID 2>/dev/null || true
  fi
done

# Also kill any lingering nodemon or node server processes by name
echo "🧹 Killing any lingering nodemon / node server processes..."
pkill -f "nodemon.*server.js" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
sleep 1

echo "✅ All ports free."
echo ""
echo "🔥 Starting backend and frontend..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Backend (background)
cd "$SCRIPT_DIR/backend"
PORT=$BACKEND_PORT npx nodemon server.js &
BACKEND_PID=$!

# Frontend (foreground)
cd "$SCRIPT_DIR/frontend"
npx expo start

# Cleanup when Expo stops
kill $BACKEND_PID 2>/dev/null || true
pkill -f "nodemon.*server.js" 2>/dev/null || true
