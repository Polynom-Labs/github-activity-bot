#!/bin/bash

# Install GitHub App on Organizations using gh CLI
# Run this after creating the app via web UI

set -e

echo "=== GitHub App Installation ==="
echo ""

# Get app details
read -p "Enter GitHub App ID: " APP_ID
read -p "Enter webhook secret: " WEBHOOK_SECRET
read -p "Enter path to private key file (.pem): " PRIVATE_KEY_PATH

if [ ! -f "$PRIVATE_KEY_PATH" ]; then
    echo "Error: Private key file not found: $PRIVATE_KEY_PATH"
    exit 1
fi

# Copy private key to project
cp "$PRIVATE_KEY_PATH" ./github-app.pem
echo "✓ Copied private key to ./github-app.pem"

# Update .env
echo ""
echo "Updating .env file..."

# Use a temporary file for safer sed operations on macOS
if [ -f .env ]; then
    cp .env .env.backup
fi

# Update or add GITHUB_APP_ID
if grep -q "^GITHUB_APP_ID=" .env 2>/dev/null; then
    sed -i '' "s/^GITHUB_APP_ID=.*/GITHUB_APP_ID=$APP_ID/" .env
else
    echo "GITHUB_APP_ID=$APP_ID" >> .env
fi

# Update or add GITHUB_WEBHOOK_SECRET
if grep -q "^GITHUB_WEBHOOK_SECRET=" .env 2>/dev/null; then
    sed -i '' "s|^GITHUB_WEBHOOK_SECRET=.*|GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET|" .env
else
    echo "GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
fi

# Update or add GITHUB_PRIVATE_KEY_PATH
if grep -q "^GITHUB_PRIVATE_KEY_PATH=" .env 2>/dev/null; then
    sed -i '' "s|^GITHUB_PRIVATE_KEY_PATH=.*|GITHUB_PRIVATE_KEY_PATH=./github-app.pem|" .env
else
    echo "GITHUB_PRIVATE_KEY_PATH=./github-app.pem" >> .env
fi

echo "✓ Updated .env file"

# Show available orgs
echo ""
echo "Available organizations:"
gh api user/orgs --jq '.[].login' | nl -w2 -s'. '

echo ""
read -p "Enter organization names (comma-separated) to install the app on: " ORGS_INPUT

# Convert to array
IFS=',' read -ra ORGS_ARRAY <<< "$ORGS_INPUT"
ORGS=()
for org in "${ORGS_ARRAY[@]}"; do
    ORGS+=($(echo "$org" | xargs))
done

echo ""
echo "Installing app on: ${ORGS[@]}"
echo ""

# Note: GitHub App installation via API requires the app to be created first
# and we need to use the installation API which might require different auth
# For now, we'll provide manual instructions but try the API

for org in "${ORGS[@]}"; do
    echo "Attempting to install on $org..."
    
    # Try to get installation ID first
    INSTALLATION_ID=$(gh api "/orgs/$org/installations" --jq ".[] | select(.app_id == $APP_ID) | .id" 2>/dev/null || echo "")
    
    if [ -n "$INSTALLATION_ID" ]; then
        echo "  ✓ App already installed (Installation ID: $INSTALLATION_ID)"
    else
        echo "  → Please install manually:"
        echo "    1. Go to: https://github.com/settings/apps"
        echo "    2. Click on your app (ID: $APP_ID)"
        echo "    3. Click 'Install App'"
        echo "    4. Select organization: $org"
        echo "    5. Choose 'All repositories' or select specific repos"
        echo "    6. Click 'Install'"
    fi
done

echo ""
echo "✓ Setup complete!"
echo ""
echo "Summary:"
echo "  App ID: $APP_ID"
echo "  Webhook Secret: $WEBHOOK_SECRET"
echo "  Private Key: ./github-app.pem"
echo "  Organizations: ${ORGS[@]}"
echo ""
echo "Next steps:"
echo "1. Make sure app is installed on all organizations"
echo "2. Get ngrok URL: ngrok http 3000"
echo "3. Update webhook URL in GitHub App settings"
echo "4. Test webhook delivery"
