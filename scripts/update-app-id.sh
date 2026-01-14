#!/bin/bash

# Quick script to update App ID in .env
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <APP_ID>"
    echo ""
    echo "Example: $0 123456"
    exit 1
fi

APP_ID=$1

cd "$(dirname "$0")/.."

if grep -q "^GITHUB_APP_ID=" .env; then
    sed -i '' "s/^GITHUB_APP_ID=.*/GITHUB_APP_ID=$APP_ID/" .env
else
    echo "GITHUB_APP_ID=$APP_ID" >> .env
fi

echo "✓ Updated GITHUB_APP_ID to $APP_ID"
echo ""
echo "Current GitHub settings in .env:"
grep "^GITHUB" .env
