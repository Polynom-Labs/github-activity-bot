#!/bin/bash

# Install GitHub App on multiple organizations
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <APP_ID>"
    echo ""
    echo "This script will help install the GitHub App on:"
    echo "  1. mov3r"
    echo "  2. tetragaze"
    echo "  3. NamerProtocol"
    echo "  4. arcane-finance-defi"
    echo "  5. Polynom-Labs"
    echo "  6. Yona-Labs"
    echo "  7. Reactor-Fuel"
    exit 1
fi

APP_ID=$1
ORGS=("mov3r" "tetragaze" "NamerProtocol" "arcane-finance-defi" "Polynom-Labs" "Yona-Labs" "Reactor-Fuel")

echo "=== Installing GitHub App (ID: $APP_ID) ==="
echo ""

for org in "${ORGS[@]}"; do
    echo "Checking installation status for $org..."
    
    # Check if app is already installed
    INSTALLATION=$(gh api "/orgs/$org/installations" --jq ".[] | select(.app_id == $APP_ID) | {id: .id, account: .account.login}" 2>/dev/null || echo "")
    
    if [ -n "$INSTALLATION" ]; then
        INSTALLATION_ID=$(echo "$INSTALLATION" | jq -r '.id')
        echo "  ✓ Already installed (Installation ID: $INSTALLATION_ID)"
    else
        echo "  → Not installed yet"
        echo "    Install manually at: https://github.com/organizations/$org/settings/installations"
        echo "    Or visit: https://github.com/settings/apps and click 'Install App'"
    fi
    echo ""
done

echo "To install the app on an organization:"
echo "1. Go to: https://github.com/settings/apps"
echo "2. Click on your app (ID: $APP_ID)"
echo "3. Click 'Install App'"
echo "4. Select each organization"
echo "5. Choose 'All repositories' or select specific repos"
echo "6. Click 'Install'"
echo ""
echo "After installation, run this script again to verify."
