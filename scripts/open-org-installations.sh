#!/bin/bash

# Open organization installation pages
ORGS=("mov3r" "arcane-finance-defi" "Polynom-Labs" "Yona-Labs" "Reactor-Fuel")

echo "Opening installation pages for organizations..."
echo ""

for org in "${ORGS[@]}"; do
    URL="https://github.com/organizations/$org/settings/installations"
    echo "Opening $org..."
    open "$URL" 2>/dev/null || echo "  URL: $URL"
    sleep 2
done

echo ""
echo "For each organization:"
echo "1. Look for 'Repo Tracking' in the list of available apps"
echo "2. Click 'Configure' or 'Install' next to it"
echo "3. Choose 'All repositories' or select specific repos"
echo "4. Click 'Install' or 'Save'"
