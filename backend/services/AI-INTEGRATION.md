# AI Integration Guide

This directory contains the AI integration for the POS system. This is **development-only** functionality and is not included in the final product build.

## Supported Providers

- **OpenAI** - GPT-3.5-turbo, GPT-4
- **DeepSeek** - DeepSeek Chat API

## Setup

### 1. Add API Keys to `.env`

```env
# Choose one or both providers
DEEPSEEK_API_KEY=your_deepseek_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Set which provider to use (default: openai)
AI_PROVIDER=openai
```

### 2. Install Dependencies

```bash
npm install
```

The following packages are required:
- `openai` - OpenAI SDK
- `axios` - For DeepSeek API calls

## Usage

### Basic Generation

```javascript
const aiService = require('./services/ai');

// Simple prompt
const response = await aiService.generate('Explain POS systems briefly');

// Custom options
const response = await aiService.generate('Analyze this order', {
  temperature: 0.5,
  maxTokens: 500,
  systemPrompt: 'You are a POS expert'
});
```

### Debugging Code

```javascript
const aiService = require('./services/ai');

const suggestion = await aiService.debugCode(
  `const result = arr.map(x => x.price)`, // Your code
  `Cannot read property 'price' of undefined` // Error message
);
console.log(suggestion);
```

### Analyzing Data

```javascript
const aiService = require('./services/ai');

const orders = [
  { id: 1, total: 150, items: 5 },
  { id: 2, total: 200, items: 3 }
];

const analysis = await aiService.analyzeData(
  orders,
  'Identify trends in our orders'
);
console.log(analysis);
```

### Orchestrating Multi-Step Tasks

```javascript
const aiService = require('./services/ai');

const steps = [
  {
    prompt: 'Summarize {{data}} for order {{orderId}}'
  },
  {
    prompt: 'Based on the summary above ({{step_0_result}}), generate insights'
  },
  {
    prompt: 'Create an action plan based on {{step_1_result}}'
  }
];

const context = {
  data: 'Order with 5 items, $150 total',
  orderId: 'ORD-001'
};

const results = await aiService.orchestrate(steps, context);
console.log(results);
```

### Using Helper Utilities

```javascript
const { 
  suggestOrderOptimizations,
  generateProductRecommendations,
  getAIHelp,
  orchestrateOrderWorkflow
} = require('./services/ai-utils');

// Suggest order optimizations
const suggestions = await suggestOrderOptimizations(orders);

// Generate product recommendations
const recommendations = await generateProductRecommendations(products);

// Get help with an issue
const help = await getAIHelp('Customers complaining about slow checkout', 'Mobile app');

// Orchestrate workflow
const invoiceSteps = await orchestrateOrderWorkflow({
  orderId: 'ORD-001',
  storeName: 'My Store',
  date: new Date().toISOString(),
  items: ['Burger $10', 'Fries $5'],
  taxRate: 8,
  discountType: 'loyalty'
});
```

## API Endpoints (Development Only)

> ⚠️ These endpoints are only available when `NODE_ENV !== 'production'`

### Check Status
```
GET /api/ai/status
```

Response:
```json
{
  "status": "ready",
  "config": {
    "provider": "openai",
    "configured": true,
    "hasOpenAIKey": true,
    "hasDeepSeekKey": false
  }
}
```

### Generate Response
```
POST /api/ai/generate
```

Body:
```json
{
  "prompt": "What is a POS system?",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

### Debug Code
```
POST /api/ai/debug
```

Body:
```json
{
  "code": "const x = arr.map(i => i.value)",
  "error": "Cannot read property 'value' of undefined"
}
```

### Analyze Data
```
POST /api/ai/analyze
```

Body:
```json
{
  "data": { "orders": 100, "revenue": 5000 },
  "context": "Last 30 days"
}
```

### Orchestrate Multi-Step Task
```
POST /api/ai/orchestrate
```

Body:
```json
{
  "steps": [
    { "prompt": "Summarize {{data}}" },
    { "prompt": "Based on {{step_0_result}}, provide insights" }
  ],
  "context": { "data": "5 orders, 50 items sold" }
}
```

## Configuration

### Environment Variables

```env
# Required
DEEPSEEK_API_KEY=your_key
OPENAI_API_KEY=your_key

# Optional
AI_PROVIDER=openai  # Default: openai
NODE_ENV=development # Leave blank or set to 'development' to enable AI routes
```

### Switching Providers

Change `AI_PROVIDER` in `.env`:
- `openai` - Uses OpenAI GPT models
- `deepseek` - Uses DeepSeek Chat model

```env
AI_PROVIDER=deepseek
```

## Important Notes

⚠️ **Development Only**
- AI features are disabled in production (`NODE_ENV=production`)
- API routes are only available during development
- Remove API keys from version control (use `.env` which is in `.gitignore`)

🔒 **Security**
- Keep API keys secret
- Never commit `.env` to version control
- Use `.env.example` to document required variables
- Rate limit AI requests to avoid excessive API costs

💰 **Cost Management**
- Monitor API usage to avoid unexpected charges
- Use temperature and maxTokens to control response quality/cost
- Test with DeepSeek (often cheaper) before OpenAI

## Debugging

### Check if AI is configured
```javascript
const aiService = require('./services/ai');
console.log(aiService.getConfig());
```

### Enable debug logging
Add to `server.js`:
```javascript
const aiService = require('./services/ai');
console.log('AI Config:', aiService.getConfig());
```

### Common Issues

**"AI service not configured"**
- Check that API_KEY environment variables are set
- Verify `.env` file has correct keys
- Ensure API keys are valid and have sufficient credits

**"API key not configured" for specific provider**
- Set the correct `AI_PROVIDER` in `.env`
- Ensure the corresponding API key exists

**Slow responses**
- Reduce `maxTokens` parameter
- Lower `temperature` for faster, more deterministic responses
- Use `deepseek` for faster responses (often cheaper too)

## Examples

### Example 1: Real-time Order Analysis
```javascript
// In your order creation route
const { suggestOrderOptimizations } = require('./services/ai-utils');

app.post('/orders', async (req, res) => {
  // ... create order ...
  
  // Suggest optimizations
  if (process.env.NODE_ENV !== 'production') {
    try {
      const suggestions = await suggestOrderOptimizations(allOrders);
      console.log('Order optimization suggestions:', suggestions);
    } catch (err) {
      console.error('AI suggestion failed:', err);
    }
  }
});
```

### Example 2: Error Debugging Helper
```javascript
const { aiService } = require('./services/ai-utils');

// In error handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && process.env.AI_DEBUG) {
    aiService.debugCode(err.stack, err.message).then(suggestion => {
      console.log('AI Debug Suggestion:', suggestion);
    }).catch(console.error);
  }
  
  res.status(500).json({ error: err.message });
});
```

## Production Deployment

1. **Remove AI routes** - Set `NODE_ENV=production`
2. **Remove API keys** - Don't commit `.env` to git
3. **Test thoroughly** - Remove AI dependencies if not needed
4. **Optional: Keep module** - Keep this code for debugging in staging environment

To completely remove AI in production build, you can:
- Skip installing optional dependency: `npm install --no-optional`
- Remove from `package.json` dependencies if truly not needed
- Wrap imports in try-catch for graceful fallback
