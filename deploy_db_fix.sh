#!/bin/bash
echo "🛡️ Deploying DB Safety Fix..."

cd /Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma

# 1. Restore Procfile to correct demo-server
echo "web: node src/demo-server.js" > Procfile

# 2. Configure remote
git remote set-url origin https://denzelw4949-blip@github.com/denzelw4949-blip/care-os.git

# 3. Commit and Push
git add src/database/db.js Procfile
git commit -m "Fix: Decouple DB from demo server (Mock Mode)"

echo "---------------------------------------------------"
echo "🔐 PASTE TOKEN TO DEPLOY FIX"
echo "---------------------------------------------------"

git push origin main

echo "---------------------------------------------------"
echo "✅ DB FIX DEPLOYED. RETRY SLACK VERIFICATION IN 2 MINS."
