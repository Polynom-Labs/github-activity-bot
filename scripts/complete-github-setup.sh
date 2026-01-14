#!/bin/bash

# Complete GitHub App setup after creation
set -e

echo "=== Complete GitHub App Setup ==="
echo ""

# Get app details
read -p "Enter GitHub App ID: " APP_ID
read -p "Enter path to private key file (.pem): " PEM_PATH

if [ ! -f "$PEM_PATH" ]; then
    echo "Error: Private key file not found: $PEM_PATH"
    exit 1
fi

# Get webhook secret
WEBHOOK_SECRET=$(cat /tmp/webhook_secret.txt 2>/dev/null || read -sp "Enter webhook secret: " WEBHOOK_SECRET && echo)

# Copy private key
cp "$PEM_PATH" ./github-app.pem
echo "✓ Copied private key to ./github-app.pem"

# Update .env
echo ""
echo "Updating .env file..."

[ -f .env ] || touch .env

# Backup .env
cp .env .env.backup 2>/dev/null || true

# Update or add variables
grep -q "^GITHUB_APP_ID=" .env && sed -i '' "s/^GITHUB_APP_ID=.*/GITHUB_APP_ID=$APP_ID/" .env || echo "GITHUB_APP_ID=$APP_ID" >> .env
grep -q "^GITHUB_WEBHOOK_SECRET=" .env && sed -i '' "s|^GITHUB_WEBHOOK_SECRET=.*|GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET|" .env || echo "GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
grep -q "^GITHUB_PRIVATE_KEY_PATH=" .env && sed -i '' "s|^GITHUB_PRIVATE_KEY_PATH=.*|GITHUB_PRIVATE_KEY_PATH=./github-app.pem|" .env || echo "GITHUB_PRIVATE_KEY_PATH=./github-app.pem" >> .env

echo "✓ Updated .env file"
echo ""

# Show installation status
echo "Checking installation status on organizations..."
./scripts/install-on-orgs.sh "$APP_ID"

echo ""
echo "✓ Setup complete!"
echo ""
echo "Summary:"
echo "  App ID: $APP_ID"
echo "  Webhook Secret: $WEBHOOK_SECRET"
echo "  Private Key: ./github-app.pem"
echo ""
echo "Next steps:"
echo "1. Install app on all organizations (see above)"
echo "2. Get ngrok URL: ngrok http 3000"
echo "3. Update webhook URL in GitHub App settings"
echo "4. Test webhook delivery"
