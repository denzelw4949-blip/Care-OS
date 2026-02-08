#!/bin/bash
echo "🚀 Merging Fix to Main for Deployment..."

cd /Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma

# Configure remote again just in case
git remote set-url origin https://denzelw4949-blip@github.com/denzelw4949-blip/care-os.git

# Checkout main (or fetch and reset if divergent)
git checkout main
git pull origin main

# Merge the fix branch
git merge fix-deployment-502

echo "---------------------------------------------------"
echo "🔐 PASTE YOUR GITHUB TOKEN AGAIN TO DEPLOY TO MAIN"
echo "---------------------------------------------------"

# Push to main to trigger Railway
git push origin main

echo "---------------------------------------------------"
echo "✅ MERGED AND PUSHED TO MAIN!"
