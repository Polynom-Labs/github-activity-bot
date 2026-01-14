# Deployment Guide

## Quick Start Checklist

### 1. Environment Setup

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in required values in `.env`:**
   - Database URL
   - GitHub App credentials
   - Telegram bot token and channel ID

### 2. Database Setup

**Option A: Using Docker Compose (Recommended)**
```bash
docker-compose up -d db
# Wait for DB to be healthy, then:
npm run migrate
```

**Option B: Existing PostgreSQL**
```bash
# Create database
createdb github_activity

# Update DATABASE_URL in .env, then:
npm run migrate
```

### 3. GitHub App Setup

1. **Create GitHub App:**
   - Go to https://github.com/settings/apps/new
   - Set webhook URL: `https://your-domain.com/webhook`
   - Generate webhook secret (save it!)
   - Set permissions (see README.md)
   - Download private key (.pem file)

2. **Install GitHub App in organizations:**
   - Go to your app settings
   - Click "Install App"
   - Select each organization (5 orgs)
   - Choose "All repositories" or specific repos
   - Click "Install"

3. **Update `.env`:**
   ```bash
   GITHUB_APP_ID=12345
   GITHUB_WEBHOOK_SECRET=your_secret_here
   GITHUB_PRIVATE_KEY_PATH=./github-app.pem
   ```

### 4. Telegram Setup

1. **Create bot via @BotFather:**
   - Send `/newbot`
   - Follow instructions
   - Save bot token

2. **Create channel:**
   - Create public/private channel
   - Add bot as administrator
   - Get channel ID (use @userinfobot or check channel info)

3. **Create admin group (optional):**
   - Create group for admin commands
   - Add bot to group
   - Get group ID

4. **Update `.env`:**
   ```bash
   TELEGRAM_BOT_TOKEN=123456:ABC-xyz
   TELEGRAM_CHANNEL_ID=@your_channel
   TELEGRAM_ADMIN_GROUP_ID=-100123456789
   ```

### 5. Build and Run

**Development:**
```bash
npm install
npm run dev
```

**Production:**
```bash
npm install
npm run build
npm start
```

**Docker:**
```bash
docker-compose up -d
```

### 6. Verify Setup

1. **Check health endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Test webhook (from GitHub):**
   - Make a test commit or PR in one of your repos
   - Check Telegram channel for activity
   - Check logs for webhook processing

3. **Test admin commands:**
   - In admin Telegram group, try: `/stats`
   - Should see activity stats

### 7. Webhook Configuration

Your webhook URL should be accessible:
```
https://your-domain.com/webhook
```

**For local testing (use ngrok or similar):**
```bash
ngrok http 3000
# Use the ngrok URL as webhook URL in GitHub App settings
```

### 8. Initial Configuration

1. **Set up user whitelist (for alerts):**
   ```
   /whitelist add alice
   /whitelist add bob
   # ... add all 15 devs
   ```

2. **Link GitHub ↔ Telegram accounts (optional):**
   ```
   /link alice 123456789
   /link bob 987654321
   ```

3. **Configure alert threshold:**
   ```
   /threshold pr_review_hours 24
   ```

### 9. Monitoring

**Check logs:**
```bash
# Docker
docker-compose logs -f app

# Direct
# Logs will show in console or your logging system
```

**Key things to monitor:**
- Webhook delivery success/failures
- Database connection health
- Telegram message sending
- Scheduled jobs (daily/weekly reports)

### 10. Production Considerations

1. **Use process manager (PM2):**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name github-bot
   pm2 save
   pm2 startup
   ```

2. **Set up reverse proxy (nginx):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **SSL/HTTPS (Let's Encrypt):**
   ```bash
   certbot --nginx -d your-domain.com
   ```

4. **Database backups:**
   ```bash
   # Add to crontab
   0 3 * * * pg_dump github_activity > backup_$(date +\%Y\%m\%d).sql
   ```

5. **Environment variables:**
   - Use secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Never commit `.env` file

### Troubleshooting

**Webhooks not received:**
- Check webhook URL is accessible
- Verify GitHub App is installed in orgs
- Check webhook secret matches
- Review application logs

**Telegram messages not sending:**
- Verify bot token is correct
- Ensure bot is admin in channel
- Check channel ID format
- Review rate limiting

**Database connection errors:**
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Verify user permissions
- Check connection pool settings

### Next Steps After Deployment

1. ✅ Monitor for 24-48 hours
2. ✅ Verify all events are being captured
3. ✅ Check daily/weekly reports are generating
4. ✅ Test alert system
5. ✅ Fine-tune alert thresholds
6. ✅ Add more users to whitelist as needed
