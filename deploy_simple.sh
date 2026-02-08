#!/bin/bash
echo "🛑 DEPLOYING NUCLEAR OPTION: SIMPLE SERVER"

cd /Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma

# 1. Update Procfile to run simple server
echo "web: node src/simple-server.js" > Procfile

# 2. Configure remote
git remote set-url origin https://denzelw4949-blip@github.com/denzelw4949-blip/care-os.git

# 3. Commit and Push
git add src/simple-server.js Procfile
git commit -m "Debug: Deploy minimal server to test connectivity"

echo "---------------------------------------------------"
echo "🔐 PASTE TOKEN TO DEPLOY SIMPLE SERVER"
echo "---------------------------------------------------"

git push origin main

echo "---------------------------------------------------"
echo "✅ SIMPLE SERVER DEPLOYED. IF THIS FAILS, RAILWAY IS BROKEN."
