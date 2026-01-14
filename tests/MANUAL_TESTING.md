# Manual Testing Guide

This guide walks through manual testing steps to verify the GitHub integration works correctly.

## Prerequisites

1. **Local Environment Setup**
   ```bash
   # Start database
   docker-compose up -d db
   
   # Run migrations
   npm run migrate
   
   # Start app
   npm run dev
   ```

2. **ngrok Setup**
   ```bash
   # Install ngrok (if not already installed)
   # https://ngrok.com/download
   
   # Start ngrok tunnel
   ngrok http 3000
   
   # Note the HTTPS URL (e.g., https://abc123.ngrok.io)
   ```

3. **GitHub App Setup**
   - Create GitHub App at https://github.com/settings/apps/new
   - Set webhook URL: `https://your-ngrok-url.ngrok.io/webhook`
   - Set webhook secret (save it!)
   - Enable events: push, pull_request, pull_request_review, issues, issue_comment
   - Download private key (.pem file)
   - Install app in test organization

4. **Telegram Setup**
   - Create bot via @BotFather
   - Create channel, add bot as admin
   - Create admin group, add bot
   - Get channel ID and group ID

5. **Environment Variables**
   ```bash
   # Update .env with:
   GITHUB_WEBHOOK_SECRET=your_secret_from_github_app
   GITHUB_APP_ID=your_app_id
   GITHUB_PRIVATE_KEY_PATH=./github-app.pem
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHANNEL_ID=@your_channel
   TELEGRAM_ADMIN_GROUP_ID=-100123456789
   ```

## Test 1: Webhook Signature Verification

### Test 1.1: Valid Signature

```bash
# Generate signature
payload='{"test":"data"}'
secret="your_webhook_secret"
signature=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$secret" | sed 's/^.* //')
signature="sha256=$signature"

# Send request
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $signature" \
  -H "X-GitHub-Event: push" \
  -H "X-GitHub-Delivery: test-delivery-$(date +%s)" \
  -d "$payload"
```

**Expected:** `200 OK` with `{"message":"Webhook processed"}`

### Test 1.2: Invalid Signature

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=invalid" \
  -H "X-GitHub-Event: push" \
  -H "X-GitHub-Delivery: test-delivery-invalid" \
  -d '{"test":"data"}'
```

**Expected:** `401 Unauthorized`

### Test 1.3: Missing Headers

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

**Expected:** `400 Bad Request`

## Test 2: Push Event

1. **Create test repository** in GitHub
2. **Make a commit:**
   ```bash
   git clone https://github.com/your-org/test-repo.git
   cd test-repo
   echo "test" > test.txt
   git add test.txt
   git commit -m "Test commit"
   git push origin main
   ```

3. **Verify in database:**
   ```sql
   SELECT * FROM commits ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM github_events WHERE event_type = 'push' ORDER BY created_at DESC LIMIT 1;
   ```

4. **Check Telegram channel** for message

**Expected:**
- Commit stored in database
- Telegram message posted with commit details

## Test 3: Pull Request Event

1. **Create PR** in test repository
2. **Verify in database:**
   ```sql
   SELECT * FROM pull_requests WHERE number = <pr_number>;
   ```

3. **Check Telegram channel** for PR opened message

4. **Merge the PR**

5. **Verify:**
   ```sql
   SELECT * FROM pull_requests WHERE number = <pr_number> AND merged = true;
   ```

6. **Check Telegram channel** for merged message

**Expected:**
- PR events stored correctly
- Merged status captured
- Telegram messages posted

## Test 4: Review Event

1. **Submit review** on a PR (approve, request changes, or comment)
2. **Verify in database:**
   ```sql
   SELECT * FROM reviews WHERE pr_number = <pr_number>;
   ```

3. **Check Telegram channel** for review message

**Expected:**
- Review stored with correct state
- Telegram message shows correct emoji/status

## Test 5: Issues & Comments

1. **Create issue** in test repository
2. **Verify in database:**
   ```sql
   SELECT * FROM issues WHERE number = <issue_number>;
   ```

3. **Comment on issue**

4. **Verify:**
   ```sql
   SELECT * FROM issue_comments WHERE issue_number = <issue_number>;
   ```

**Expected:**
- Issues and comments stored
- Telegram messages posted

## Test 6: Admin Commands

In Telegram admin group:

### Test 6.1: /stats Command
```
/stats
/stats testuser
/stats testuser week
```

**Expected:** Returns activity statistics

### Test 6.2: /threshold Command
```
/threshold pr_review_hours 24
```

**Expected:** Confirms threshold updated

### Test 6.3: /whitelist Command
```
/whitelist add testuser
/whitelist remove testuser
```

**Expected:** Manages whitelist correctly

### Test 6.4: /link Command
```
/link testuser 123456789
```

**Expected:** Links GitHub user to Telegram ID

### Test 6.5: /report Command
```
/report daily
/report weekly
```

**Expected:** Generates and posts reports

## Test 7: Scheduled Jobs

### Test 7.1: Daily Report

1. **Temporarily modify cron** in `.env`:
   ```bash
   DAILY_REPORT_CRON="* * * * *"  # Run every minute for testing
   ```

2. **Restart app**

3. **Wait 1-2 minutes**

4. **Check Telegram channel** for daily report

5. **Restore original cron** after testing

### Test 7.2: Alert Checker

1. **Create open PR** without reviews
2. **Add PR author to whitelist:**
   ```
   /whitelist add <author>
   ```
3. **Set low threshold:**
   ```
   /threshold pr_review_hours 1
   ```
4. **Wait 15 minutes** (alert checker runs every 15 min)
5. **Check Telegram channel** for alert

### Test 7.3: Cleanup Job

1. **Manually insert old data:**
   ```sql
   INSERT INTO github_events (delivery_id, event_type, org, repo, sender, payload, created_at)
   VALUES ('old-event', 'push', 'test', 'test', 'test', '{}', NOW() - INTERVAL '100 days');
   ```

2. **Run cleanup manually** or wait for scheduled run (2 AM UTC)

3. **Verify old data deleted:**
   ```sql
   SELECT * FROM github_events WHERE delivery_id = 'old-event';
   ```

**Expected:** Old data deleted, recent data preserved

## Test 8: Error Handling

### Test 8.1: Database Connection Loss

1. **Stop database:**
   ```bash
   docker-compose stop db
   ```

2. **Trigger webhook** (should fail gracefully)

3. **Restart database:**
   ```bash
   docker-compose start db
   ```

4. **Trigger webhook again** (should recover)

**Expected:** App doesn't crash, errors logged, recovery works

### Test 8.2: Invalid Telegram Token

1. **Temporarily set invalid token** in `.env`

2. **Trigger event**

3. **Check logs** for error

4. **Restore valid token**

**Expected:** Error logged, app continues running

## Test 9: Rate Limiting

1. **Trigger 10+ events rapidly** (make multiple commits quickly)

2. **Check Telegram channel** - messages should be spaced out

3. **Check logs** for rate limiting

**Expected:** Messages sent with delays, no spam

## Test 10: Data Integrity

### Verify All Tables

```sql
SELECT 
  'commits' as table_name, COUNT(*) as count FROM commits
UNION ALL
SELECT 'pull_requests', COUNT(*) FROM pull_requests
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'issues', COUNT(*) FROM issues
UNION ALL
SELECT 'issue_comments', COUNT(*) FROM issue_comments
UNION ALL
SELECT 'github_events', COUNT(*) FROM github_events;
```

### Verify Relationships

```sql
-- Commits linked to correct org/repo
SELECT DISTINCT org, repo FROM commits;

-- Reviews linked to PRs
SELECT r.*, pr.number as pr_number
FROM reviews r
JOIN pull_requests pr ON r.org = pr.org AND r.repo = pr.repo AND r.pr_number = pr.number
LIMIT 5;
```

## Troubleshooting

### Webhooks not received
- Check ngrok is running and URL is correct
- Verify GitHub App webhook URL matches ngrok URL
- Check app logs for errors
- Verify webhook secret matches

### Database errors
- Verify database is running: `docker-compose ps`
- Check connection string in `.env`
- Run migrations: `npm run migrate`

### Telegram messages not sending
- Verify bot token is correct
- Check bot is admin in channel
- Verify channel ID format
- Check rate limiting isn't blocking

### Tests failing
- Ensure test database exists
- Check environment variables are set
- Verify mocks are properly configured
