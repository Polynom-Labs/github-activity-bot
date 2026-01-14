# GitHub App Setup Guide

## Step 1: Create GitHub App

1. Go to: https://github.com/settings/apps/new
2. Fill in the following fields:

   **GitHub App name:** `GitHub Activity Bot` (or your preferred name)
   
   **Homepage URL:** `https://github.com` (or your repo URL)
   
   **Webhook URL:** 
   - For now, use: `https://placeholder.ngrok.io/webhook`
   - **We'll update this after ngrok is running!**
   
   **Webhook secret:** 
   - Generate a secure random string (save this!)
   - You can use: `openssl rand -hex 32`
   - **IMPORTANT:** Save this secret - you'll need it for `.env`

3. **Permissions & events:**
   
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

4. **Where can this GitHub App be installed?**
   - Select: "Only on this account" or "Any account" (depending on your needs)

5. Click **"Create GitHub App"**

## Step 2: Get App Credentials

After creating the app, you'll be on the app's settings page. You need:

1. **App ID:** 
   - Found at the top of the page (e.g., "App ID: 123456")
   - Copy this number

2. **Generate Private Key:**
   - Scroll down to "Private keys"
   - Click **"Generate a private key"**
   - A `.pem` file will download automatically
   - **IMPORTANT:** Save this file securely! You can only download it once.
   - Move it to your project: `cp ~/Downloads/github-activity-bot.*.pem ./github-app.pem`

3. **Webhook Secret:**
   - Scroll to "Webhook" section
   - You should see the secret you entered (or generate a new one)
   - Copy this value

## Step 3: Install the App

1. Click **"Install App"** button (top right)
2. Select the organization(s) or account where you want to install it
3. Choose repositories:
   - "All repositories" OR
   - "Only select repositories" (then pick specific repos)
4. Click **"Install"**

## Step 4: Update Environment Variables

After you have:
- ✅ App ID
- ✅ Private key file path
- ✅ Webhook secret
- ✅ ngrok URL (once ngrok is running)

Update your `.env` file with:

```bash
GITHUB_APP_ID=<your_app_id>
GITHUB_PRIVATE_KEY_PATH=./github-app.pem
GITHUB_WEBHOOK_SECRET=<your_webhook_secret>
```

## Step 5: Update Webhook URL (After ngrok is running)

Once ngrok is working and you have the public URL:

1. Go back to your GitHub App settings: https://github.com/settings/apps
2. Click on your app
3. Scroll to "Webhook" section
4. Update **Webhook URL** to: `https://<your-ngrok-url>.ngrok.io/webhook`
5. Click **"Update webhook"**

## Troubleshooting

- **Can't see "Generate private key" button?** Make sure you're on the app's settings page, not the installation page
- **Webhook not receiving events?** Check that:
  - ngrok is running and URL is correct
  - Webhook secret matches in both GitHub and `.env`
  - App is installed on the repositories you're testing
