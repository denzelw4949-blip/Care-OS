#!/bin/bash
# Quick script to manually run database migrations

echo "🔄 Running database migrations on Railway..."
echo ""
echo "This will set up all tables in your PostgreSQL database."
echo ""

npm run db:migrate
