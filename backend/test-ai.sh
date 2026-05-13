#!/bin/bash

# AI Integration Quick Start Guide
# Run these commands to test the AI integration after setup

echo "🚀 POS System AI Integration Quick Start"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${YELLOW}Checking if server is running on port 5000...${NC}"
if ! curl -s http://localhost:5000/api/ai/status > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Server not running. Starting server...${NC}"
    npm start &
    sleep 2
fi

echo ""
echo -e "${BLUE}1. Check AI Service Status${NC}"
curl -X GET http://localhost:5000/api/ai/status | json_pp
echo ""

echo -e "${BLUE}2. Generate AI Response${NC}"
curl -X POST http://localhost:5000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the key features of a modern POS system?",
    "temperature": 0.7,
    "maxTokens": 200
  }' | json_pp
echo ""

echo -e "${BLUE}3. Debug Code Error${NC}"
curl -X POST http://localhost:5000/api/ai/debug \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const items = orders.map(o => o.items)",
    "error": "Cannot read property '"'"'items'"'"' of undefined - order object is null"
  }' | json_pp
echo ""

echo -e "${BLUE}4. Analyze POS Data${NC}"
curl -X POST http://localhost:5000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orders": 150,
      "revenue": 7500,
      "avgOrderValue": 50,
      "topProduct": "Burger"
    },
    "context": "Last 30 days business metrics"
  }' | json_pp
echo ""

echo -e "${BLUE}5. Orchestrate Multi-Step Workflow${NC}"
curl -X POST http://localhost:5000/api/ai/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "steps": [
      {
        "prompt": "Summarize this order: {{orderData}}"
      },
      {
        "prompt": "Based on the summary ({{step_0_result}}), suggest upsell opportunities"
      }
    ],
    "context": {
      "orderData": "Customer ordered a burger and fries for $15. No drinks."
    }
  }' | json_pp
echo ""

echo -e "${GREEN}✅ Quick start complete!${NC}"
echo ""
echo "For more examples, see: backend/services/AI-INTEGRATION.md"
