#!/bin/bash

# Update webhook URL in GitHub App settings
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <WEBHOOK_URL>"
    echo ""
    echo "Example: $0 https://abc123.ngrok.io/webhook"
    echo ""
    echo "This will update the webhook URL in your GitHub App settings."
    exit 1
fi

WEBHOOK_URL=$1
APP_ID=$(grep "^GITHUB_APP_ID=" .env 2>/dev/null | cut -d'=' -f2 || echo "")

if [ -z "$APP_ID" ]; then
    echo "Error: GITHUB_APP_ID not found in .env"
    exit 1
fi

echo "=== Updating Webhook URL ==="
echo ""
echo "App ID: $APP_ID"
echo "New Webhook URL: $WEBHOOK_URL"
echo ""
echo "To update manually:"
echo "1. Go to: https://github.com/settings/apps"
echo "2. Click on your app (ID: $APP_ID)"
echo "3. Scroll to 'Webhook' section"
echo "4. Update 'Webhook URL' to: $WEBHOOK_URL"
echo "5. Click 'Update webhook'"
echo ""
echo "Or visit directly:"
echo "  https://github.com/settings/apps/$APP_ID"
echo ""
echo "Note: GitHub API doesn't allow updating webhook URL programmatically"
echo "      without app authentication. Please update manually."
