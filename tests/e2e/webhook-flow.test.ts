/**
 * End-to-End Tests
 * 
 * These tests require:
 * - Real database (set TEST_DATABASE_URL)
 * - Real Telegram bot token (set TEST_TELEGRAM_BOT_TOKEN)
 * - Mock or real GitHub API responses
 * 
 * Run with: npm run test:e2e
 */

import request from 'supertest';
import express from 'express';
import { webhookRouter } from '../../src/github/webhook';
import { generateWebhookSignature, createWebhookHeaders } from '../helpers';
import pushEventFixture from '../fixtures/push-event.json';
import prEventFixture from '../fixtures/pull-request-event.json';
import { getPool, query } from '../../src/db/index';
import nock from 'nock';

// Skip E2E tests if not configured
const SKIP_E2E = !process.env.TEST_DATABASE_URL || !process.env.TEST_TELEGRAM_BOT_TOKEN;

describe.skip('E2E Webhook Flow', () => {
  let app: express.Application;

  beforeAll(async () => {
    if (SKIP_E2E) {
      console.log('Skipping E2E tests - missing TEST_DATABASE_URL or TEST_TELEGRAM_BOT_TOKEN');
      return;
    }

    app = express();
    app.use(express.json());
    app.use('/webhook', webhookRouter);

    // Ensure database is ready
    const pool = getPool();
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    // Cleanup test data
    if (!SKIP_E2E) {
      await query('DELETE FROM github_events WHERE delivery_id LIKE $1', [`e2e-test-%`]);
      await query('DELETE FROM commits WHERE sha LIKE $1', ['e2e-test-%']);
    }
  });

  beforeEach(() => {
    // Mock GitHub API if needed
    nock('https://api.github.com')
      .persist()
      .get(/\/app\/installations/)
      .reply(200, [
        {
          id: 12345,
          account: { login: 'test-org' },
        },
      ]);

    nock('https://api.github.com')
      .post(/\/app\/installations\/\d+\/access_tokens/)
      .reply(200, { token: 'test-token' });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should process push event and store in database', async () => {
    if (SKIP_E2E) return;

    const deliveryId = `e2e-test-push-${Date.now()}`;
    const payload = {
      ...pushEventFixture,
      commits: [
        {
          ...pushEventFixture.commits[0],
          id: `e2e-test-commit-${Date.now()}`,
        },
      ],
    };

    const signature = generateWebhookSignature(payload, process.env.TEST_WEBHOOK_SECRET || 'test_secret_123');
    const headers = createWebhookHeaders('push', deliveryId, signature);

    const response = await request(app)
      .post('/webhook')
      .set(headers)
      .send(payload);

    expect(response.status).toBe(200);

    // Verify data in database
    const events = await query(
      'SELECT * FROM github_events WHERE delivery_id = $1',
      [deliveryId]
    );
    expect(events.length).toBe(1);

    const commits = await query(
      'SELECT * FROM commits WHERE sha = $1',
      [payload.commits[0].id]
    );
    expect(commits.length).toBe(1);
  });

  it('should process PR event and store in database', async () => {
    if (SKIP_E2E) return;

    const deliveryId = `e2e-test-pr-${Date.now()}`;
    const payload = {
      ...prEventFixture,
      pull_request: {
        ...prEventFixture.pull_request,
        id: Date.now(),
        number: Math.floor(Math.random() * 10000),
      },
    };

    const signature = generateWebhookSignature(payload, process.env.TEST_WEBHOOK_SECRET || 'test_secret_123');
    const headers = createWebhookHeaders('pull_request', deliveryId, signature);

    const response = await request(app)
      .post('/webhook')
      .set(headers)
      .send(payload);

    expect(response.status).toBe(200);

    // Verify PR in database
    const prs = await query(
      'SELECT * FROM pull_requests WHERE gh_id = $1',
      [payload.pull_request.id]
    );
    expect(prs.length).toBeGreaterThan(0);
  });
});
