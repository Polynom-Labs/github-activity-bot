import request from 'supertest';
import express from 'express';
import { webhookRouter } from '../../../src/github/webhook';
import { generateWebhookSignature, createWebhookHeaders } from '../../helpers';
import * as eventsRepo from '../../../src/db/repositories/events';

jest.mock('../../../src/db/repositories/events');
jest.mock('../../../src/github/events/push');
jest.mock('../../../src/github/events/pullRequest');
jest.mock('../../../src/github/events/review');
jest.mock('../../../src/github/events/issues');
jest.mock('../../../src/github/events/issueComment');

const mockCheckDeliveryIdExists = eventsRepo.checkDeliveryIdExists as jest.MockedFunction<typeof eventsRepo.checkDeliveryIdExists>;
const mockStoreGitHubEvent = eventsRepo.storeGitHubEvent as jest.MockedFunction<typeof eventsRepo.storeGitHubEvent>;

describe('GitHub Webhook Handler', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(webhookRouter);
    jest.clearAllMocks();
    mockCheckDeliveryIdExists.mockResolvedValue(false);
    mockStoreGitHubEvent.mockResolvedValue(1);
  });

  describe('Signature Verification', () => {
    it('should accept valid signature', async () => {
      const payload = {
        repository: {
          full_name: 'test-org/test-repo',
        },
        sender: {
          login: 'testuser',
        },
      };
      const signature = generateWebhookSignature(payload, 'test_secret_123');
      const headers = createWebhookHeaders('push', 'test-delivery-1', signature);

      const response = await request(app)
        .post('/webhook')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook processed');
    });

    it('should reject invalid signature', async () => {
      const payload = { test: 'data' };
      const headers = createWebhookHeaders('push', 'test-delivery-2', 'sha256=invalid');

      const response = await request(app)
        .post('/webhook')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject missing signature header', async () => {
      const response = await request(app)
        .post('/webhook')
        .set({
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-3',
        })
        .send({ test: 'data' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required headers');
    });
  });

  describe('Idempotency', () => {
    it('should reject duplicate delivery IDs', async () => {
      const payload = {
        repository: {
          full_name: 'test-org/test-repo',
        },
        sender: {
          login: 'testuser',
        },
      };
      const signature = generateWebhookSignature(payload, 'test_secret_123');
      const headers = createWebhookHeaders('push', 'duplicate-delivery', signature);

      mockCheckDeliveryIdExists.mockResolvedValueOnce(false); // First call
      mockCheckDeliveryIdExists.mockResolvedValueOnce(true); // Second call (duplicate)

      // First request
      const response1 = await request(app)
        .post('/webhook')
        .set(headers)
        .send(payload);

      expect(response1.status).toBe(200);

      // Second request with same delivery ID
      const response2 = await request(app)
        .post('/webhook')
        .set(headers)
        .send(payload);

      expect(response2.status).toBe(200);
      expect(response2.body.message).toBe('Already processed');
    });
  });

  describe('Header Validation', () => {
    it('should reject missing event type', async () => {
      const payload = { test: 'data' };
      const signature = generateWebhookSignature(payload, 'test_secret_123');

      const response = await request(app)
        .post('/webhook')
        .set({
          'x-hub-signature-256': signature,
          'x-github-delivery': 'test-delivery-4',
        })
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should reject missing delivery ID', async () => {
      const payload = { test: 'data' };
      const signature = generateWebhookSignature(payload, 'test_secret_123');

      const response = await request(app)
        .post('/webhook')
        .set({
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
        })
        .send(payload);

      expect(response.status).toBe(400);
    });
  });
});
