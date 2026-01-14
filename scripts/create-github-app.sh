#!/bin/bash

# GitHub App Creation Script
# This script helps create and configure a GitHub App using gh CLI

set -e

echo "=== GitHub App Setup ==="
echo ""

# Generate webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Generated webhook secret: $WEBHOOK_SECRET"
echo ""

# Get user input
read -p "GitHub App name (default: GitHub Activity Bot): " APP_NAME
APP_NAME=${APP_NAME:-"GitHub Activity Bot"}

read -p "Homepage URL (default: https://github.com): " HOMEPAGE_URL
HOMEPAGE_URL=${HOMEPAGE_URL:-"https://github.com"}

echo ""
echo "Available organizations:"
gh api user/orgs --jq '.[].login' | nl

echo ""
read -p "Enter organization names (comma-separated) to install the app on: " ORGS_INPUT

# Convert comma-separated input to array
IFS=',' read -ra ORGS <<< "$ORGS_INPUT"
ORGS=($(echo "$ORGS_INPUT" | tr ',' '\n' | tr -d ' '))

echo ""
echo "Selected organizations: ${ORGS[@]}"
echo ""

# For now, we'll create a manifest file that can be used to create the app
# Note: GitHub App creation via API requires using app manifests
# The user will need to complete the creation via web UI, but we'll prepare everything

MANIFEST_FILE="github-app-manifest.json"

cat > "$MANIFEST_FILE" << EOF
{
  "name": "$APP_NAME",
  "url": "$HOMEPAGE_URL",
  "hook_attributes": {
    "url": "https://placeholder.ngrok.io/webhook",
    "active": true
  },
  "redirect_url": "$HOMEPAGE_URL",
  "public": false,
  "default_permissions": {
    "contents": "read",
    "issues": "read",
    "pull_requests": "read",
    "metadata": "read"
  },
  "default_events": [
    "push",
    "pull_request",
    "pull_request_review",
    "issues",
    "issue_comment"
  ]
}
EOF

echo "Created manifest file: $MANIFEST_FILE"
echo ""
echo "Next steps:"
echo "1. Create the app using the manifest:"
echo "   Visit: https://github.com/settings/apps/new"
echo "   Or use: gh api --method POST /app-manifests/:code/conversions"
echo ""
echo "2. After creating the app, you'll get:"
echo "   - App ID"
echo "   - Private key (.pem file)"
echo ""
echo "3. Save the webhook secret: $WEBHOOK_SECRET"
echo ""
echo "4. Once you have the App ID and private key, run:"
echo "   ./scripts/install-github-app.sh <APP_ID> <ORG1> <ORG2> ..."
echo ""
