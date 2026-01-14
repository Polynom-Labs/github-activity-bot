# Test Suite Documentation

## Overview

This test suite covers unit tests, integration tests, and end-to-end tests for the GitHub Activity Telegram Bot.

## Test Structure

```
tests/
├── setup.ts              # Jest configuration and global setup
├── helpers.ts            # Test utility functions
├── fixtures/             # Mock webhook payloads and test data
│   ├── push-event.json
│   ├── pull-request-event.json
│   ├── review-event.json
│   ├── issues-event.json
│   └── issue-comment-event.json
├── unit/                 # Unit tests (isolated components)
│   ├── github/
│   │   ├── webhook.test.ts
│   │   └── events/
│   │       └── push.test.ts
│   ├── telegram/
│   │   └── formatters.test.ts
│   └── domain/
│       └── stats.test.ts
├── integration/          # Integration tests (components working together)
│   ├── webhook.test.ts
│   └── database.test.ts
└── e2e/                  # End-to-end tests (full flow)
    └── webhook-flow.test.ts
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Suites
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests only
```

## Test Environment Setup

### Unit & Integration Tests

These tests use mocks and don't require external services. They run automatically.

### E2E Tests

E2E tests require:
- Real PostgreSQL database
- Real Telegram bot token (optional, can mock)

Set environment variables:
```bash
export TEST_DATABASE_URL="postgres://user:pass@localhost:5432/github_activity_test"
export TEST_WEBHOOK_SECRET="test_secret_123"
export TEST_TELEGRAM_BOT_TOKEN="123456:TEST-TOKEN"  # Optional
```

E2E tests are skipped if `TEST_DATABASE_URL` is not set.

## Writing Tests

### Unit Test Example

```typescript
import { formatPushMessage } from '../../../src/telegram/formatters';

describe('formatPushMessage', () => {
  it('should format single commit', () => {
    const commits = [/* ... */];
    const message = formatPushMessage('org', 'repo', 'main', 'user', commits);
    expect(message).toContain('org/repo');
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';
import { webhookRouter } from '../../src/github/webhook';

describe('Webhook Integration', () => {
  it('should process push event', async () => {
    const response = await request(app)
      .post('/webhook')
      .set(headers)
      .send(payload);
    expect(response.status).toBe(200);
  });
});
```

## Test Fixtures

Fixtures are located in `tests/fixtures/` and contain sample webhook payloads from GitHub.

To add a new fixture:
1. Create JSON file with webhook payload
2. Import in test: `import fixture from '../fixtures/my-event.json'`

## Mocking

### Database
```typescript
jest.mock('../../src/db/repositories/events');
const mockStoreCommit = eventsRepo.storeCommit as jest.MockedFunction<...>;
```

### Telegram
```typescript
jest.mock('../../src/telegram/channel');
```

### GitHub API
Use `nock` for HTTP mocking:
```typescript
import nock from 'nock';

nock('https://api.github.com')
  .get('/app/installations')
  .reply(200, [/* ... */]);
```

## Test Coverage Goals

- Unit tests: 80%+ coverage
- Integration tests: Critical paths covered
- E2E tests: Main user flows

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Before deployment

## Troubleshooting

### Tests failing with database errors
- Ensure test database exists
- Check `TEST_DATABASE_URL` is set correctly
- Run migrations: `npm run migrate`

### Tests timing out
- Increase timeout in `jest.config.js`
- Check for hanging async operations
- Verify mocks are properly set up

### E2E tests skipped
- Set `TEST_DATABASE_URL` environment variable
- Ensure database is accessible
- Check test database has correct schema
