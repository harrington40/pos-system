#!/bin/bash

echo "🚀 PhonicsLearn Production Setup"
echo "================================"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL first."
    echo "   Ubuntu/Debian: sudo apt install postgresql"
    echo "   macOS: brew install postgresql"
    exit 1
fi

echo "✓ PostgreSQL found"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+first."
    exit 1
fi

echo "✓ Python 3 found"

# Install backend dependencies
echo ""
echo "📦 Installing Python dependencies..."
cd backend
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"

# Setup database
echo ""
echo "🗄️  Setting up database..."
echo "   Please ensure PostgreSQL is running"
echo ""

# Check if database exists
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw phonicslearn; then
    echo "⚠️  Database 'phonicslearn' already exists"
    read -p "   Drop and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        psql -U postgres -c "DROP DATABASE IF EXISTS phonicslearn;"
        psql -U postgres -c "DROP USER IF EXISTS phonicslearn;"
        psql -U postgres -f setup_db.sql
        echo "✓ Database recreated"
    else
        echo "✓ Using existing database"
    fi
else
    psql -U postgres -f setup_db.sql
    if [ $? -ne 0 ]; then
        echo "❌ Failed to setup database"
        echo "   Try running: psql -U postgres -f backend/setup_db.sql"
        exit 1
    fi
    echo "✓ Database created"
fi

# Create .env file if not exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✓ .env created"
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env with your API keys:"
    echo "   - STRIPE_SECRET_KEY (from https://dashboard.stripe.com/apikeys)"
    echo "   - SENDGRID_API_KEY (from https://app.sendgrid.com/settings/api_keys)"
else
    echo "✓ .env file exists"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit backend/.env with your API keys"
echo "   2. Start backend:  cd backend && python -m uvicorn app.main:app --reload"
echo "   3. Start frontend: python -m http.server 3000"
echo "   4. Visit: http://localhost:3000/landing.html"
echo ""
echo "📖 Full documentation: PRODUCTION_SETUP.md"
