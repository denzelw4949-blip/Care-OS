#!/bin/bash
echo "🚀 Applying Safety Patch..."

cd /Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma

# Configure remote 
git remote set-url origin https://denzelw4949-blip@github.com/denzelw4949-blip/care-os.git

# Stage and Commit
git add src/demo-server.js
git commit -m "Fix: Add global error handlers to prevent crash on auth failure"

echo "---------------------------------------------------"
echo "🔐 PASTE YOUR GITHUB TOKEN TO DEPLOY SAFETY FIX"
echo "---------------------------------------------------"

# Push
git push origin main

echo "---------------------------------------------------"
echo "✅ PATCH DEPLOYED!"
