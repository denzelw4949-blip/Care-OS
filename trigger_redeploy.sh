#!/bin/bash
echo "🔄 Triggering Fresh Deployment..."

cd /Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma

# Configure remote  
git remote set-url origin https://denzelw4949-blip@github.com/denzelw4949-blip/care-os.git

# Empty commit to force rebuild
git commit --allow-empty -m "Trigger Re-deploy: Force fresh build"

echo "---------------------------------------------------"
echo "🔐 PASTE TOKEN TO FORCE RE-DEPLOY"
echo "---------------------------------------------------"

git push origin main

echo "---------------------------------------------------"
echo "✅ RE-DEPLOY TRIGGERED! PRAY TO THE RAILWAY GODS."
