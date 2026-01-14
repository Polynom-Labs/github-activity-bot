# GitHub Activity Telegram Bot

A production-ready Telegram bot that tracks GitHub activity across multiple organizations and repositories using GitHub App webhooks. Posts real-time updates to a Telegram channel, generates daily/weekly reports, and sends alerts for stale pull requests.

## Features

- **Real-time Activity Tracking**: Receives GitHub webhooks for push events, pull requests, reviews, issues, and comments
- **Telegram Channel Integration**: Posts all activity to a Telegram channel with formatted messages
- **Daily & Weekly Reports**: Automated reports showing team activity, top contributors, and top repositories
- **PR Review Alerts**: Configurable alerts for pull requests waiting for review (whitelist-based)
- **Admin Commands**: Manage settings, view stats, and link GitHub/Telegram accounts via Telegram group commands
- **Idempotent Webhook Processing**: Prevents duplicate event processing using delivery IDs
- **Multi-Organization Support**: Tracks activity across multiple GitHub organizations

## Architecture

- **Backend**: Node.js/TypeScript with Express
- **Database**: PostgreSQL for event storage
- **Webhooks**: GitHub App webhooks with signature verification
- **Scheduling**: node-cron for daily/weekly reports and alert checks
- **Telegram**: node-telegram-bot-api for bot and channel integration

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 16+
- Docker and Docker Compose (for local development)
- A GitHub App installed in your organizations
- A Telegram bot token and channel

## Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd github-activity-bot
npm install
```

### 2. GitHub App Configuration

1. Go to https://github.com/settings/apps/new
2. Create a new GitHub App with the following settings:
   - **Name**: Your bot name
   - **Homepage URL**: Your app URL
   - **Webhook URL**: `https://your-domain.com/webhook`
   - **Webhook secret**: Generate a secure random string (save this!)
   - **Permissions**:
     - Repository permissions:
       - Contents: Read-only
       - Issues: Read-only
       - Pull requests: Read-only
       - Metadata: Read-only
     - Subscribe to events:
       - Push
       - Pull request
       - Pull request review
       - Issues
       - Issue comment
3. After creating the app:
   - Note the **App ID**
   - Generate and download a **private key** (.pem file)
   - Save the **webhook secret**

### 3. Telegram Setup

1. Create a bot via [@BotFather](https://t.me/BotFather):
   - Send `/newbot` and follow instructions
   - Save the bot token
2. Create a Telegram channel for activity updates
3. Add your bot as an administrator to the channel
4. Get the channel ID:
   - Forward a message from the channel to [@userinfobot](https://t.me/userinfobot)
   - Or use the format `@channelname` or numeric ID `-1001234567890`
5. Create an admin group (optional, for commands):
   - Add the bot to the group
   - Get the group ID (same method as channel)

### 4. Environment Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_WEBHOOK_SECRET`: From GitHub App settings
- `GITHUB_APP_ID`: From GitHub App settings
- `GITHUB_PRIVATE_KEY_PATH`: Path to your .pem file (e.g., `./github-app.pem`)
- `TELEGRAM_BOT_TOKEN`: From @BotFather
- `TELEGRAM_CHANNEL_ID`: Your channel ID
- `TELEGRAM_ADMIN_GROUP_ID`: Your admin group ID (for commands)

### 5. Database Setup

The app will automatically run migrations on startup. For manual migration:

```bash
npm run migrate
```

### 6. Install GitHub App in Organizations

For each organization you want to track:

1. Go to your GitHub App settings
2. Click "Install App"
3. Select the organization
4. Choose "All repositories" or specific repositories
5. Click "Install"

## Running Locally

### Using Docker Compose (Recommended)

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Manual Setup

1. Start PostgreSQL:
   ```bash
   # Using Docker
   docker run -d \
     --name postgres \
     -e POSTGRES_DB=github_activity \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 \
     postgres:16-alpine
   ```

2. Build and run:
   ```bash
   npm run build
   npm start
   ```

3. For development with auto-reload:
   ```bash
   npm run dev
   ```

## Webhook Configuration

Your webhook URL should be:
```
https://your-domain.com/webhook
```

The bot expects:
- Content-Type: `application/json`
- Header: `X-Hub-Signature-256` (GitHub signature)
- Header: `X-GitHub-Event` (event type)
- Header: `X-GitHub-Delivery` (delivery ID)

## Admin Commands

All commands must be sent in the admin Telegram group:

### `/stats [github_user] [period]`

View activity statistics.

- `github_user` (optional): GitHub username to filter by
- `period` (optional): `today`, `week`, or `month` (default: today)

Examples:
```
/stats
/stats alice
/stats bob week
```

### `/threshold pr_review_hours <hours>`

Set the PR review alert threshold in hours.

Example:
```
/threshold pr_review_hours 48
```

### `/whitelist add|remove <github_username>`

Manage the alert whitelist. Only whitelisted users will receive PR review alerts.

Examples:
```
/whitelist add alice
/whitelist remove bob
```

### `/link <github_username> <telegram_user_id>`

Link a GitHub username to a Telegram user for @mentions in reports.

Example:
```
/link alice 123456789
```

To get a Telegram user ID, use [@userinfobot](https://t.me/userinfobot).

### `/report daily|weekly`

Manually trigger a daily or weekly report.

Examples:
```
/report daily
/report weekly
```

## Reports

### Daily Report

Sent daily at 9 AM UTC (configurable via `DAILY_REPORT_CRON`). Includes:
- Team totals: commits, PRs, reviews, issues, comments
- Top contributors
- Top repositories

### Weekly Report

Sent weekly on Mondays at 9 AM UTC (configurable via `WEEKLY_REPORT_CRON`). Includes:
- All daily report metrics
- Code changes: lines added/deleted

## Alerts

PR review alerts are checked every 15 minutes. Alerts are sent for:
- Open pull requests
- Without recent reviews
- Older than the configured threshold (default: 24 hours)
- From whitelisted GitHub users only

Alert format:
```
⚠️ PR Review Alert

PR #123 in org/repo has been waiting for review for 48h
Author: @username
"PR Title"
https://github.com/...
```

## Database Schema

The bot stores:
- `github_events`: Raw webhook payloads (for idempotency)
- `commits`: Individual commits from push events
- `pull_requests`: PR events (opened, closed, merged)
- `reviews`: PR review events
- `issues`: Issue events
- `issue_comments`: Issue comment events
- `user_mappings`: GitHub ↔ Telegram user mappings
- `settings`: Runtime configuration (alert thresholds, etc.)

### Database Optimizations

The database includes:
- **Composite indexes** for common query patterns (author + date, org/repo + date)
- **Partial indexes** for filtered queries (e.g., open PRs)
- **Optimized queries** using CTEs and aggregations instead of correlated subqueries
- **Automatic cleanup** job that runs daily to remove old data:
  - Raw events: 90 days retention (configurable via `DATA_RETENTION_RAW_EVENTS_DAYS`)
  - Activity data: 365 days retention (configurable via `DATA_RETENTION_ACTIVITY_DAYS`)
- **Connection pooling** with optimized settings for read-heavy workloads

## Security

- **Webhook Signature Verification**: All webhooks are verified using HMAC-SHA256
- **Idempotency**: Duplicate webhook deliveries are rejected
- **Environment Variables**: Sensitive data stored in environment variables
- **No Sensitive Logging**: Webhook payloads are not logged
- **Private Key**: GitHub App private key loaded from file system

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests (requires TEST_DATABASE_URL)
```

### Test Structure

- `tests/unit/` - Unit tests for isolated components
- `tests/integration/` - Integration tests for component interactions
- `tests/e2e/` - End-to-end tests for full flows
- `tests/fixtures/` - Mock webhook payloads and test data

See [tests/README.md](tests/README.md) for detailed testing documentation.

### Manual Testing

For manual testing with real GitHub webhooks, see [tests/MANUAL_TESTING.md](tests/MANUAL_TESTING.md).

## Development

### Project Structure

```
src/
├── config/          # Configuration loading
├── db/              # Database connection and repositories
├── domain/          # Business logic and types
├── github/          # Webhook handling and event processors
├── telegram/        # Bot, channel posting, and commands
├── jobs/            # Scheduled jobs (reports, alerts)
├── utils/           # Shared utilities (logger)
└── index.ts         # Entry point
```

### Scripts

- `npm run build`: Compile TypeScript
- `npm start`: Run production build
- `npm run dev`: Run with auto-reload
- `npm run migrate`: Run database migrations
- `npm run typecheck`: Type check without building

## Quick Start

1. **Set up environment:** Copy `.env.example` to `.env` and fill in values
2. **Start database:** `docker-compose up -d db` (or use existing PostgreSQL)
3. **Run migrations:** `npm run migrate`
4. **Configure GitHub App:** Create app, install in orgs, set webhook URL
5. **Configure Telegram:** Create bot, channel, get IDs
6. **Start bot:** `npm run dev` (development) or `npm start` (production)

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment guide.

## Troubleshooting

### Webhooks not received

1. Check webhook URL is accessible
2. Verify GitHub App webhook secret matches `.env`
3. Check GitHub App is installed in organizations
4. Review application logs for errors

### Telegram messages not sending

1. Verify bot token is correct
2. Ensure bot is admin in the channel
3. Check channel ID format (use `@channelname` or numeric ID)
4. Review rate limiting (max 20 messages/minute)

### Database connection errors

1. Verify `DATABASE_URL` is correct
2. Ensure PostgreSQL is running
3. Check database exists and user has permissions
4. Review connection pool settings

### Reports not generating

1. Check cron expressions in `.env`
2. Verify scheduler is running (check logs)
3. Ensure there's activity data in the database
4. Check timezone settings (cron uses UTC)

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- Code follows TypeScript best practices
- All tests pass
- Code is properly typed
- No sensitive data in logs or commits
# Test Webhook Wed Jan 14 23:24:14 +03 2026
# Webhook Test 23:26:49
