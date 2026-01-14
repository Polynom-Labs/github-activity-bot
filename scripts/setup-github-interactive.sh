#!/bin/bash

# Interactive GitHub App Setup using gh CLI
set -e

echo "=== GitHub App Setup ==="
echo ""

# Generate webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "✓ Generated webhook secret: $WEBHOOK_SECRET"
echo ""

# Get app name
read -p "GitHub App name (default: GitHub Activity Bot): " APP_NAME
APP_NAME=${APP_NAME:-"GitHub Activity Bot"}

# Show available orgs
echo ""
echo "Available organizations:"
gh api user/orgs --jq '.[].login' | nl -w2 -s'. '

echo ""
read -p "Enter organization names (comma-separated) to track: " ORGS_INPUT
IFS=',' read -ra ORGS_ARRAY <<< "$ORGS_INPUT"
ORGS=()
for org in "${ORGS_ARRAY[@]}"; do
    ORGS+=($(echo "$org" | xargs))
done

echo ""
echo "Selected: ${ORGS[@]}"
echo ""

# Open GitHub App creation page
echo "Opening GitHub App creation page..."
echo "Please fill in:"
echo "  Name: $APP_NAME"
echo "  Homepage URL: https://github.com"
echo "  Webhook URL: https://placeholder.ngrok.io/webhook (we'll update)"
echo "  Webhook secret: $WEBHOOK_SECRET"
echo "  Permissions: Contents (read), Issues (read), Pull requests (read)"
echo "  Events: push, pull_request, pull_request_review, issues, issue_comment"
echo ""

open "https://github.com/settings/apps/new" 2>/dev/null || echo "Please visit: https://github.com/settings/apps/new"

read -p "Press Enter after creating the app and downloading the private key..."

read -p "Enter App ID: " APP_ID
read -p "Enter path to .pem file: " PEM_PATH

if [ ! -f "$PEM_PATH" ]; then
    echo "Error: File not found: $PEM_PATH"
    exit 1
fi

cp "$PEM_PATH" ./github-app.pem
echo "✓ Copied to ./github-app.pem"

# Update .env
echo ""
echo "Updating .env..."
[ -f .env ] || touch .env

grep -q "^GITHUB_APP_ID=" .env && sed -i '' "s/^GITHUB_APP_ID=.*/GITHUB_APP_ID=$APP_ID/" .env || echo "GITHUB_APP_ID=$APP_ID" >> .env
grep -q "^GITHUB_WEBHOOK_SECRET=" .env && sed -i '' "s|^GITHUB_WEBHOOK_SECRET=.*|GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET|" .env || echo "GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
grep -q "^GITHUB_PRIVATE_KEY_PATH=" .env && sed -i '' "s|^GITHUB_PRIVATE_KEY_PATH=.*|GITHUB_PRIVATE_KEY_PATH=./github-app.pem|" .env || echo "GITHUB_PRIVATE_KEY_PATH=./github-app.pem" >> .env

echo "✓ .env updated"

# Install on orgs
echo ""
echo "Installing app on organizations..."
for org in "${ORGS[@]}"; do
    echo ""
    echo "Installing on $org..."
    APP_URL="https://github.com/apps/$(echo "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')"
    echo "Visit: https://github.com/organizations/$org/settings/installations"
    echo "Or: $APP_URL"
    read -p "Press Enter after installing on $org..."
    
    # Verify installation
    INSTALLATION=$(gh api "/orgs/$org/installations" --jq ".[] | select(.app_id == $APP_ID)" 2>/dev/null || echo "")
    if [ -n "$INSTALLATION" ]; then
        echo "✓ Verified installation on $org"
    else
        echo "⚠ Could not verify installation (this is OK if you just installed)"
    fi
done

echo ""
echo "✓ Setup complete!"
echo ""
echo "App ID: $APP_ID"
echo "Webhook Secret: $WEBHOOK_SECRET"
echo "Organizations: ${ORGS[@]}"
