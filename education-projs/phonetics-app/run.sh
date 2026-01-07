#!/bin/bash
# Simple startup - no dependencies issues

pkill -9 python python3 2>/dev/null

# Start web server
cd /mnt/c/Users/harri/designProject2020/education-projs/phonetics-app
python3 -m http.server 3000 > /tmp/web.log 2>&1 &

# Start backend
cd /mnt/c/Users/harri/designProject2020/education-projs/phonetics-app/backend
source venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &

sleep 3
echo "✅ App started! Open: http://localhost:3000"
