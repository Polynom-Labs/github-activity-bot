#!/bin/bash

# Check organization third-party app policies
ORGS=("mov3r" "arcane-finance-defi" "Polynom-Labs" "Yona-Labs" "Reactor-Fuel")

echo "=== Organization Third-Party App Policies ==="
echo ""
echo "Check these settings for each organization:"
echo ""

for org in "${ORGS[@]}"; do
    echo "$org:"
    echo "  https://github.com/organizations/$org/settings/oauth_application_policy"
    echo ""
done

echo "On each page, make sure:"
echo "  - 'Third-party application access policy' allows apps"
echo "  - Or at least allows 'Repository administrators can install GitHub Apps'"
echo ""
echo "Opening pages..."
sleep 2

for org in "${ORGS[@]}"; do
    open "https://github.com/organizations/$org/settings/oauth_application_policy" 2>/dev/null
    sleep 2
done
