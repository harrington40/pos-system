#!/bin/bash

# AI Setup Wizard - Interactive setup for AI integration
# Run this script to configure DeepSeek and OpenAI API keys

echo "🤖 POS System AI Integration Setup Wizard"
echo "=========================================="
echo ""
echo "This wizard will help you configure AI providers for development."
echo "These credentials will be stored in .env (not committed to git)"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env created"
fi

echo ""
echo "📝 Configure AI Providers"
echo "========================="
echo ""

# OpenAI Setup
echo "1. OpenAI Setup (recommended for most use cases)"
echo "   Get your API key from: https://platform.openai.com/api-keys"
read -p "Enter your OpenAI API Key (or press Enter to skip): " openai_key

if [ -n "$openai_key" ]; then
    # Update .env file
    if grep -q "OPENAI_API_KEY=" .env; then
        sed -i "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$openai_key|" .env
    else
        echo "OPENAI_API_KEY=$openai_key" >> .env
    fi
    echo "✅ OpenAI API key configured"
else
    echo "⏭️  Skipping OpenAI"
fi

echo ""

# DeepSeek Setup
echo "2. DeepSeek Setup (often cheaper alternative)"
echo "   Get your API key from: https://platform.deepseek.com/api_keys"
read -p "Enter your DeepSeek API Key (or press Enter to skip): " deepseek_key

if [ -n "$deepseek_key" ]; then
    # Update .env file
    if grep -q "DEEPSEEK_API_KEY=" .env; then
        sed -i "s|DEEPSEEK_API_KEY=.*|DEEPSEEK_API_KEY=$deepseek_key|" .env
    else
        echo "DEEPSEEK_API_KEY=$deepseek_key" >> .env
    fi
    echo "✅ DeepSeek API key configured"
else
    echo "⏭️  Skipping DeepSeek"
fi

echo ""

# Provider Selection
echo "3. Choose Default Provider"
echo "   a) OpenAI (GPT-3.5/GPT-4)"
echo "   b) DeepSeek (faster, cheaper)"
read -p "Choose provider (a/b) [default: a]: " provider_choice

case "$provider_choice" in
    b|B)
        sed -i "s|AI_PROVIDER=.*|AI_PROVIDER=deepseek|" .env
        echo "✅ Default provider set to DeepSeek"
        ;;
    *)
        sed -i "s|AI_PROVIDER=.*|AI_PROVIDER=openai|" .env
        echo "✅ Default provider set to OpenAI"
        ;;
esac

echo ""

# Installation
echo "4. Installing Dependencies"
read -p "Install npm dependencies now? (y/n) [default: y]: " install_deps

case "$install_deps" in
    n|N)
        echo "⏭️  Skip npm install"
        ;;
    *)
        echo "Installing dependencies..."
        npm install
        echo "✅ Dependencies installed"
        ;;
esac

echo ""
echo "==========================================="
echo "✅ AI Setup Complete!"
echo "==========================================="
echo ""
echo "📋 Summary of Configuration:"
echo "   - OpenAI Key: $(grep OPENAI_API_KEY .env | cut -d= -f2 | head -c 10)..."
echo "   - DeepSeek Key: $(grep DEEPSEEK_API_KEY .env | cut -d= -f2 | head -c 10)..."
echo "   - Default Provider: $(grep 'AI_PROVIDER=' .env | cut -d= -f2)"
echo ""
echo "🚀 Next Steps:"
echo "   1. Start the server: npm start"
echo "   2. Test AI integration: bash test-ai.sh"
echo "   3. Read docs: cat services/AI-INTEGRATION.md"
echo ""
echo "📚 Documentation:"
echo "   - See backend/services/AI-INTEGRATION.md for full API docs"
echo "   - Check backend/services/ai-utils.js for helper functions"
echo ""
echo "⚠️  Important Notes:"
echo "   - AI features are development-only (disabled in production)"
echo "   - Keep .env secure and out of version control"
echo "   - Monitor API usage to avoid unexpected charges"
echo "   - Use NODE_ENV=production to completely disable AI routes"
echo ""
