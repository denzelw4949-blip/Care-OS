#!/bin/bash
echo "🚀 Starting Automated Deployment Fix..."

# Ensure we are in the right directory
cd /Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma

# Configure remote to include username (saves typing it)
git remote set-url origin https://denzelw4949-blip@github.com/denzelw4949-blip/care-os.git

# Ensure we are on the fix branch
git checkout -b fix-deployment-502 2>/dev/null || git checkout fix-deployment-502

# Force add the file just in case
git add src/demo-server.js

# Allow empty commit if it's already staged/committed, just to be safe
git commit --allow-empty -m "Fix 502: Bind to 0.0.0.0"

echo "---------------------------------------------------"
echo "🔐 PLEASE PASTE YOUR GITHUB TOKEN BELOW AND HIT ENTER"
echo "(The characters will be invisible, strictly paste and enter)"
echo "---------------------------------------------------"

# Push using the simple command
git push origin fix-deployment-502

echo "---------------------------------------------------"
echo "✅ Done! Deployment triggered."
