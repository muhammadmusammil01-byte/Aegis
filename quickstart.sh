#!/bin/bash

# AEGIS Rights Broker - Quick Start Script
# This script helps you get started quickly with AEGIS

echo "🛡️  AEGIS Rights Broker - Quick Start"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js detected: $(node --version)"

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found in PATH. Please ensure MongoDB is installed."
    echo "   Visit: https://www.mongodb.com/try/download/community"
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo "  Please edit .env with your settings if needed"
else
    echo "✓ .env file exists"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create vault directory
if [ ! -d "vault" ]; then
    mkdir -p vault
    echo "✓ Vault directory created"
fi

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Make sure MongoDB is running:"
echo "   $ mongod"
echo ""
echo "2. Start the server:"
echo "   $ npm start"
echo "   or for development:"
echo "   $ npm run dev"
echo ""
echo "3. Open your browser:"
echo "   http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Overview and features"
echo "   - SETUP.md - Detailed setup guide"
echo "   - API.md - API documentation"
echo ""
echo "Happy licensing! 🚀"
