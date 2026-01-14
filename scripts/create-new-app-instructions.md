# Creating New GitHub App - Critical Settings

## Step 1: Create the App
Visit: https://github.com/settings/apps/new

## Step 2: Fill in Basic Info
- **GitHub App name:** GitHub Activity Bot (or your preferred name)
- **Homepage URL:** https://github.com
- **Webhook URL:** https://placeholder.ngrok.io/webhook (we'll update this later)
- **Webhook secret:** 270196b0ad2a2d871da3efb6fd412497d111af8799e317e8cba4d483a3dd16ca

## Step 3: Set Permissions
**Repository permissions:**
- Contents: Read-only
- Issues: Read-only  
- Pull requests: Read-only
- Metadata: Read-only (default)

**Subscribe to events:**
- ✅ Push
- ✅ Pull request
- ✅ Pull request review
- ✅ Issues
- ✅ Issue comment

## Step 4: CRITICAL - Installation Settings
**Where can this GitHub App be installed?**
- ⚠️ MUST SELECT: **"Any account"**
- ❌ DO NOT SELECT: "Only on this account"

This setting CANNOT be changed later!

## Step 5: Create and Download
1. Click "Create GitHub App"
2. Download the private key (.pem file)
3. Note the App ID (shown at the top)

## Step 6: Update Configuration
After creating, run:
```bash
./scripts/update-app-id.sh <NEW_APP_ID>
```

Then copy the new .pem file to the project:
```bash
cp ~/Downloads/your-app-name.*.pem ./github-app.pem
```
