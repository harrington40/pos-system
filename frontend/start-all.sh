#!/bin/bash

PORT=5000

echo "🔍 Checking if port $PORT is already in use..."

# Find PID of any process using port 5000
PID=$(lsof -ti tcp:$PORT)

if [ ! -z "$PID" ]; then
  echo "⚠️  Port $PORT is in use by PID $PID. Killing it..."
  kill -9 $PID
  echo "✅ Old process killed."
else
  echo "✅ Port $PORT is free."
fi

echo ""
echo "🔥 Starting backend (nodemon) and frontend (Expo)..."

# Run backend in background
cd backend && npx nodemon server.js &
BACKEND_PID=$!
cd ..

# Run Expo in foreground (so you can interact with it)
cd frontend && npx expo start

# When Expo stops, also kill the background backend
kill $BACKEND_PID 2>/dev/null
