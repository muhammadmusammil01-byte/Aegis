#!/bin/bash

# NexusHub Quick Setup Script
# This script sets up the complete NexusHub platform

set -e  # Exit on any error

echo "🚀 NexusHub Platform Setup"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL client (psql) is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL found: $(psql --version)${NC}"

echo ""

# Step 2: Install dependencies
echo "📦 Installing npm dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Environment configuration
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env with your database credentials${NC}"
    echo -e "${YELLOW}  Default values are set for local development${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi
echo ""

# Step 4: Database setup instructions
echo "🗄️  Database Setup Instructions:"
echo "================================"
echo ""
echo "Run the following commands to set up your database:"
echo ""
echo -e "${YELLOW}1. Create the database:${NC}"
echo "   createdb nexushub"
echo ""
echo -e "${YELLOW}2. Run the schema:${NC}"
echo "   psql -U postgres -d nexushub -f database/schema.sql"
echo ""
echo -e "${YELLOW}3. (Optional) Update the default admin password:${NC}"
echo "   - Generate a bcrypt hash for your password"
echo "   - Update the seed data in database/schema.sql"
echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""

# Step 5: Usage instructions
echo "🎯 Usage:"
echo "========"
echo ""
echo "Development mode (with auto-reload):"
echo "  npm run dev"
echo ""
echo "Production mode:"
echo "  npm start"
echo ""
echo "Access the application:"
echo "  http://localhost:3000"
echo ""
echo "📚 See NEXUSHUB_README.md for complete documentation"
echo ""
