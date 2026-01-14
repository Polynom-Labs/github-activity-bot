# Next Steps - Webhook Configuration

## Current Status
- ✅ GitHub App created (ID: 2658152)
- ✅ App configured with "Any account" scope
- ✅ Installed on some organizations
- ⚠️ ngrok authentication issue
- ⏳ Webhook URL needs to be updated

## Option 1: Fix ngrok

If ngrok authentication fails, try:
```bash
# Re-authenticate ngrok
ngrok authtoken YOUR_AUTH_TOKEN

# Or check ngrok config
cat ~/Library/Application\ Support/ngrok/ngrok.yml
```

Then start ngrok:
```bash
ngrok http 3000
```

Get the URL from: http://localhost:4040/api/tunnels

## Option 2: Use Alternative Tunnel

You can use:
- **Cloudflare Tunnel** (cloudflared)
- **localtunnel**: `npx localtunnel --port 3000`
- **serveo**: `ssh -R 80:localhost:3000 serveo.net`
- **LocalTunnel**: `lt --port 3000`

## Option 3: Update Webhook URL

Once you have a public URL (e.g., `https://abc123.ngrok.io`):

1. Go to: https://github.com/settings/apps/2658152
2. Scroll to "Webhook" section
3. Update "Webhook URL" to: `https://YOUR-URL/webhook`
4. Click "Update webhook"

Or use the script:
```bash
./scripts/update-webhook-url.sh https://YOUR-URL/webhook
```

## Testing

After updating webhook URL:
1. Make a test commit/push in one of the tracked repos
2. Check app logs for webhook delivery
3. Verify data in database
4. Check Telegram channel for message

## Manual Testing

See: `tests/MANUAL_TESTING.md` for complete testing guide.
