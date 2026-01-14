#!/bin/bash

# GitHub App Setup Script using gh CLI
# This script creates a GitHub App and installs it on specified organizations

set -e

echo "=== GitHub App Setup via GitHub API ==="
echo ""

# Check if gh is authenticated
if ! gh auth status &>/dev/null; then
    echo "Error: Not authenticated with GitHub. Run 'gh auth login' first."
    exit 1
fi

# Generate webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "✓ Generated webhook secret: $WEBHOOK_SECRET"
echo ""

# Get user input
read -p "GitHub App name (default: GitHub Activity Bot): " APP_NAME
APP_NAME=${APP_NAME:-"GitHub Activity Bot"}

read -p "Homepage URL (default: https://github.com): " HOMEPAGE_URL
HOMEPAGE_URL=${HOMEPAGE_URL:-"https://github.com"}

echo ""
echo "Available organizations:"
gh api user/orgs --jq '.[].login' | nl -w2 -s'. '

echo ""
read -p "Enter organization names (comma-separated) to install the app on: " ORGS_INPUT

# Convert comma-separated input to array
IFS=',' read -ra ORGS_ARRAY <<< "$ORGS_INPUT"
ORGS=()
for org in "${ORGS_ARRAY[@]}"; do
    ORGS+=($(echo "$org" | xargs))  # Trim whitespace
done

echo ""
echo "Selected organizations: ${ORGS[@]}"
echo ""

# Create app manifest
echo "Creating app manifest..."
MANIFEST_JSON=$(cat <<EOF
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
)

# Step 1: Create app manifest code
echo "Step 1: Creating app manifest..."
MANIFEST_RESPONSE=$(echo "$MANIFEST_JSON" | gh api --method POST /app-manifests/conversions -f "manifest=$(cat <<<"$MANIFEST_JSON")" 2>&1) || {
    echo ""
    echo "Note: Creating GitHub Apps via API requires special permissions."
    echo "Let's use the web-based flow instead..."
    echo ""
    echo "Please visit: https://github.com/settings/apps/new"
    echo ""
    echo "Use these settings:"
    echo "  Name: $APP_NAME"
    echo "  Homepage URL: $HOMEPAGE_URL"
    echo "  Webhook URL: https://placeholder.ngrok.io/webhook (we'll update this)"
    echo "  Webhook secret: $WEBHOOK_SECRET"
    echo "  Permissions: Contents (read), Issues (read), Pull requests (read)"
    echo "  Events: push, pull_request, pull_request_review, issues, issue_comment"
    echo ""
    read -p "Press Enter after you've created the app and downloaded the private key..."
    
    read -p "Enter the App ID: " APP_ID
    read -p "Enter the path to the private key file (.pem): " PRIVATE_KEY_PATH
    
    if [ ! -f "$PRIVATE_KEY_PATH" ]; then
        echo "Error: Private key file not found: $PRIVATE_KEY_PATH"
        exit 1
    fi
    
    # Copy private key to project directory
    cp "$PRIVATE_KEY_PATH" ./github-app.pem
    echo "✓ Copied private key to ./github-app.pem"
    
    # Update .env
    echo ""
    echo "Updating .env file..."
    if grep -q "GITHUB_APP_ID" .env 2>/dev/null; then
        sed -i '' "s/GITHUB_APP_ID=.*/GITHUB_APP_ID=$APP_ID/" .env
    else
        echo "GITHUB_APP_ID=$APP_ID" >> .env
    fi
    
    if grep -q "GITHUB_WEBHOOK_SECRET" .env 2>/dev/null; then
        sed -i '' "s/GITHUB_WEBHOOK_SECRET=.*/GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET/" .env
    else
        echo "GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
    fi
    
    if grep -q "GITHUB_PRIVATE_KEY_PATH" .env 2>/dev/null; then
        sed -i '' "s|GITHUB_PRIVATE_KEY_PATH=.*|GITHUB_PRIVATE_KEY_PATH=./github-app.pem|" .env
    else
        echo "GITHUB_PRIVATE_KEY_PATH=./github-app.pem" >> .env
    fi
    
    echo "✓ Updated .env file"
    
    # Install app on organizations
    echo ""
    echo "Installing app on organizations..."
    for org in "${ORGS[@]}"; do
        echo "Installing on $org..."
        gh api --method POST "/user/installations" \
            -f "app_id=$APP_ID" \
            -f "org=$org" \
            -f "repository_ids[]=all" 2>&1 || {
            echo "Note: Installation API might require different approach."
            echo "Please install manually:"
            echo "  1. Go to: https://github.com/settings/apps"
            echo "  2. Click on your app"
            echo "  3. Click 'Install App'"
            echo "  4. Select organization: $org"
            echo "  5. Choose repositories and install"
        }
    done
    
    echo ""
    echo "✓ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Get ngrok URL running"
    echo "2. Update webhook URL in GitHub App settings"
    echo "3. Test webhook delivery"
    exit 0
}

# If API creation worked, parse response
APP_ID=$(echo "$MANIFEST_RESPONSE" | jq -r '.id')
PRIVATE_KEY=$(echo "$MANIFEST_RESPONSE" | jq -r '.pem')

if [ -z "$APP_ID" ] || [ "$APP_ID" == "null" ]; then
    echo "Error: Failed to create app via API"
    exit 1
fi

echo "✓ Created GitHub App with ID: $APP_ID"

# Save private key
echo "$PRIVATE_KEY" > ./github-app.pem
echo "✓ Saved private key to ./github-app.pem"

# Update .env
echo ""
echo "Updating .env file..."
if grep -q "GITHUB_APP_ID" .env 2>/dev/null; then
    sed -i '' "s/GITHUB_APP_ID=.*/GITHUB_APP_ID=$APP_ID/" .env
else
    echo "GITHUB_APP_ID=$APP_ID" >> .env
fi

if grep -q "GITHUB_WEBHOOK_SECRET" .env 2>/dev/null; then
    sed -i '' "s/GITHUB_WEBHOOK_SECRET=.*/GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET/" .env
else
    echo "GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
fi

if grep -q "GITHUB_PRIVATE_KEY_PATH" .env 2>/dev/null; then
    sed -i '' "s|GITHUB_PRIVATE_KEY_PATH=.*|GITHUB_PRIVATE_KEY_PATH=./github-app.pem|" .env
else
    echo "GITHUB_PRIVATE_KEY_PATH=./github-app.pem" >> .env
fi

echo "✓ Updated .env file"

echo ""
echo "✓ Setup complete!"
echo ""
echo "App ID: $APP_ID"
echo "Webhook Secret: $WEBHOOK_SECRET"
echo "Private Key: ./github-app.pem"
echo ""
echo "Next: Install the app on organizations and update webhook URL once ngrok is running."
