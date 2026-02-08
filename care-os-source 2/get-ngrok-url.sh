#!/bin/bash

# Simple script to get ngrok URL and create Slack setup wizard

echo "🔍 Getting your ngrok public URL..."

# Wait for ngrok to start
sleep 3

# Get the ngrok URL from the API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['tunnels'][0]['public_url'] if data.get('tunnels') else '')" 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Could not get ngrok URL automatically"
    echo ""
    echo "📌 Manual steps:"
    echo "1. Open http://localhost:4040 in your browser"
    echo "2. Copy the 'Forwarding' HTTPS URL"
    echo "3. That's your ngrok URL!"
    exit 1
fi

echo "✅ Your ngrok URL: $NGROK_URL"
echo ""
echo "📋 Use these webhook URLs in Slack:"
echo "Events URL: ${NGROK_URL}/webhooks/slack/events"
echo "Interactivity URL: ${NGROK_URL}/webhooks/slack/interactions"
echo "Commands URL: ${NGROK_URL}/webhooks/slack/commands"
echo ""
echo "Opening Slack API setup page..."
open "https://api.slack.com/apps"
