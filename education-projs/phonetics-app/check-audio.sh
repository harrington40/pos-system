#!/bin/bash

echo "Testing Phonetics App Audio..."
echo ""

# Test backend
echo "1. Testing backend API..."
curl -s http://localhost:8000/api/lesson | jq '.phoneme' > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Backend API is responding"
else
    echo "✗ Backend API is NOT responding - restarting..."
    pkill -9 uvicorn
    pkill -9 python
    sleep 2
    cd /mnt/c/Users/harri/designProject2020/education-projs/phonetics-app/backend
    source venv/bin/activate
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
    sleep 3
fi

# Test audio endpoint
echo ""
echo "2. Testing audio endpoint..."
curl -s http://localhost:8000/api/audio/p -o /tmp/test_audio.wav
if [ -f /tmp/test_audio.wav ] && [ -s /tmp/test_audio.wav ]; then
    echo "✓ Audio file generated ($(du -h /tmp/test_audio.wav | cut -f1))"
else
    echo "✗ Audio endpoint not working"
fi

# Test web server
echo ""
echo "3. Testing web server..."
curl -s http://localhost:3000 | grep "Phonetics" > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Web server is responding"
else
    echo "✗ Web server not responding - restarting..."
    pkill -9 "python -m http"
    sleep 1
    cd /mnt/c/Users/harri/designProject2020/education-projs/phonetics-app
    python -m http.server 3000 > /tmp/webserver.log 2>&1 &
    sleep 2
fi

echo ""
echo "✓ All services should be running!"
echo "Open: http://localhost:3000"
