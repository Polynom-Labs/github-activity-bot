import { Router, Request, Response } from 'express';
import { createHmac } from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { storeGitHubEvent, checkDeliveryIdExists } from '../db/repositories/events';
import { handlePushEvent } from './events/push';
import { handlePullRequestEvent } from './events/pullRequest';
import { handleReviewEvent } from './events/review';
import { handleIssueEvent } from './events/issues';
import { handleIssueCommentEvent } from './events/issueComment';

const router = Router();

function verifySignature(payload: string, signature: string): boolean {
  const hmac = createHmac('sha256', config.github.webhookSecret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return signature === digest;
}

function extractOrgRepo(fullName: string): { org: string; repo: string } {
  const parts = fullName.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid repository full_name: ${fullName}`);
  }
  return { org: parts[0], repo: parts[1] };
}

router.post('/', async (req: Request, res: Response): Promise<Response> => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const eventType = req.headers['x-github-event'] as string;
    const deliveryId = req.headers['x-github-delivery'] as string;

    if (!signature || !eventType || !deliveryId) {
      logger.warn('Missing required webhook headers', {
        hasSignature: !!signature,
        hasEventType: !!eventType,
        hasDeliveryId: !!deliveryId,
      });
      return res.status(400).json({ error: 'Missing required headers' });
    }

    // Verify signature
    const rawBody = JSON.stringify(req.body);
    if (!verifySignature(rawBody, signature)) {
      logger.warn('Invalid webhook signature', { deliveryId });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check idempotency
    const exists = await checkDeliveryIdExists(deliveryId);
    if (exists) {
      logger.info('Duplicate webhook delivery ignored', { deliveryId, eventType });
      return res.status(200).json({ message: 'Already processed' });
    }

    const payload = req.body;
    const orgRepo = extractOrgRepo(payload.repository?.full_name || '');
    const sender = payload.sender?.login || 'unknown';

    // Store raw event
    await storeGitHubEvent(
      deliveryId,
      eventType,
      orgRepo.org,
      orgRepo.repo,
      sender,
      payload
    );

    // Route to event handler
    switch (eventType) {
      case 'push':
        await handlePushEvent(payload, orgRepo.org, orgRepo.repo);
        break;
      case 'pull_request':
        await handlePullRequestEvent(payload, orgRepo.org, orgRepo.repo);
        break;
      case 'pull_request_review':
        await handleReviewEvent(payload, orgRepo.org, orgRepo.repo);
        break;
      case 'issues':
        await handleIssueEvent(payload, orgRepo.org, orgRepo.repo);
        break;
      case 'issue_comment':
        await handleIssueCommentEvent(payload, orgRepo.org, orgRepo.repo);
        break;
      default:
        logger.debug('Unhandled event type', { eventType, deliveryId });
        break;
    }

    return res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as webhookRouter };
