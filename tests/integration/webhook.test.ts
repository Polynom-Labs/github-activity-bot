import request from 'supertest';
import express from 'express';
import { webhookRouter } from '../../src/github/webhook';
import { generateWebhookSignature, createWebhookHeaders } from '../helpers';
import pushEventFixture from '../fixtures/push-event.json';
import prEventFixture from '../fixtures/pull-request-event.json';
import * as eventsRepo from '../../src/db/repositories/events';
import { handlePushEvent } from '../../src/github/events/push';
import { handlePullRequestEvent } from '../../src/github/events/pullRequest';

jest.mock('../../src/db/repositories/events');
jest.mock('../../src/github/events/push');
jest.mock('../../src/github/events/pullRequest');
jest.mock('../../src/github/events/review');
jest.mock('../../src/github/events/issues');
jest.mock('../../src/github/events/issueComment');

const mockCheckDeliveryIdExists = eventsRepo.checkDeliveryIdExists as jest.MockedFunction<typeof eventsRepo.checkDeliveryIdExists>;
const mockStoreGitHubEvent = eventsRepo.storeGitHubEvent as jest.MockedFunction<typeof eventsRepo.storeGitHubEvent>;
const mockHandlePushEvent = handlePushEvent as jest.MockedFunction<typeof handlePushEvent>;
const mockHandlePullRequestEvent = handlePullRequestEvent as jest.MockedFunction<typeof handlePullRequestEvent>;

describe('Webhook Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(webhookRouter);
    jest.clearAllMocks();
    mockCheckDeliveryIdExists.mockResolvedValue(false);
    mockStoreGitHubEvent.mockResolvedValue(1);
    mockHandlePushEvent.mockResolvedValue();
    mockHandlePullRequestEvent.mockResolvedValue();
  });

  it('should process push event end-to-end', async () => {
    const payload = pushEventFixture;
    const signature = generateWebhookSignature(payload, 'test_secret_123');
    const headers = createWebhookHeaders('push', 'test-delivery-push', signature);

    const response = await request(app)
      .post('/webhook')
      .set(headers)
      .send(payload);

    expect(response.status).toBe(200);
    expect(mockCheckDeliveryIdExists).toHaveBeenCalledWith('test-delivery-push');
    expect(mockStoreGitHubEvent).toHaveBeenCalled();
    expect(mockHandlePushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: 'refs/heads/main',
        repository: expect.objectContaining({
          full_name: 'test-org/test-repo',
        }),
      }),
      'test-org',
      'test-repo'
    );
  });

  it('should process pull request event end-to-end', async () => {
    const payload = prEventFixture;
    const signature = generateWebhookSignature(payload, 'test_secret_123');
    const headers = createWebhookHeaders('pull_request', 'test-delivery-pr', signature);

    const response = await request(app)
      .post('/webhook')
      .set(headers)
      .send(payload);

    expect(response.status).toBe(200);
    expect(mockHandlePullRequestEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'opened',
        pull_request: expect.objectContaining({
          number: 42,
        }),
      }),
      'test-org',
      'test-repo'
    );
  });

  it('should handle unhandled event types gracefully', async () => {
    const payload = {
      repository: {
        full_name: 'test-org/test-repo',
      },
      sender: {
        login: 'testuser',
      },
    };
    const signature = generateWebhookSignature(payload, 'test_secret_123');
    const headers = createWebhookHeaders('unknown_event', 'test-delivery-unknown', signature);

    const response = await request(app)
      .post('/webhook')
      .set(headers)
      .send(payload);

    expect(response.status).toBe(200);
    expect(mockStoreGitHubEvent).toHaveBeenCalled();
  });
});
