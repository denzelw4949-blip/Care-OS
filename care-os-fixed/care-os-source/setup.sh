#!/bin/bash

# CARE OS Setup Script
# This script will activate CARE OS on your system

echo "🏥 CARE OS Activation Script"
echo "=============================="
echo ""

# Check if Node.js is installed
echo "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION detected"
else
    echo "❌ Node.js not found in PATH"
    echo ""
    echo "Please ensure Node.js is installed and added to your PATH:"
    echo "1. Close and reopen your terminal"
    echo "2. Or run: export PATH=\"/usr/local/bin:\$PATH\""
    echo ""
    exit 1
fi

# Check if npm is available
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm $NPM_VERSION detected"
else
    echo "❌ npm not found"
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Check for PostgreSQL
echo "Checking for PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL detected"
else
    echo "⚠️  PostgreSQL not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install postgresql@14
        brew services start postgresql@14
    else
        echo "❌ Homebrew not found. Please install PostgreSQL manually: https://www.postgresql.org/download/"
        exit 1
    fi
fi

# Check for Redis
echo "Checking for Redis..."
if command -v redis-cli &> /dev/null; then
    echo "✅ Redis detected"
else
    echo "⚠️  Redis not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install redis
        brew services start redis
    else
        echo "❌ Homebrew not found. Please install Redis manually"
        exit 1
    fi
fi

echo ""
echo "🗄️  Setting up database..."
if command -v createdb &> /dev/null; then
    # Create database if it doesn't exist
    createdb care_os 2>/dev/null || echo "Database 'care_os' already exists"
    
    # Run migrations
    psql -d care_os -f src/database/schema.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Database schema created successfully!"
    else
        echo "❌ Failed to create database schema"
        exit 1
    fi
else
    echo "⚠️  PostgreSQL command-line tools not found"
    echo "Please create database manually:"
    echo "  createdb care_os"
    echo "  psql -d care_os -f src/database/schema.sql"
fi

echo ""
echo "🚀 Starting CARE OS..."
echo ""
echo "Server will start at: http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
