import { PullRequestEventPayload } from '../../domain/types';
import { eventsRepository, PullRequest } from '../../db/repositories/events';
import { channelService } from '../../telegram/channel';
import { logger } from '../../utils/logger';
import { getInstallationToken, getPRStats } from '../api';

export async function handlePullRequestEvent(
  payload: PullRequestEventPayload,
  org: string,
  repo: string
): Promise<void> {
  try {
    const action = payload.action;
    if (!action || !['opened', 'closed', 'reopened'].includes(action)) {
      logger.debug('Ignoring PR action', { action });
      return;
    }

    const pr = payload.pull_request;
    if (!pr) {
      logger.warn('PR event missing pull_request', { action });
      return;
    }
    const author = pr.user?.login || 'unknown';
    const state = pr.state || 'open';
    const merged = action === 'closed' && (pr.merged || false);
    const eventAt = new Date(pr.updated_at || pr.created_at || new Date());

    // Get additions/deletions from webhook payload, fallback to API if missing
    let additions = pr.additions || 0;
    let deletions = pr.deletions || 0;

    // If merged PR is missing stats, fetch from API (only when needed)
    if (merged && (additions === 0 && deletions === 0)) {
      try {
        const token = await getInstallationToken(org);
        const stats = await getPRStats(org, repo, pr.number, token);
        additions = stats.additions;
        deletions = stats.deletions;
        logger.debug('Fetched PR stats from API', {
          org,
          repo,
          prNumber: pr.number,
          additions,
          deletions,
        });
      } catch (error) {
        logger.warn('Failed to fetch PR stats from API, using webhook data', {
          org,
          repo,
          prNumber: pr.number,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with webhook data (0s if missing)
      }
    }

    const prData: Omit<PullRequest, 'id' | 'created_at'> = {
      gh_id: pr.id,
      org,
      repo,
      number: pr.number,
      title: pr.title,
      author,
      state,
      action,
      merged,
      additions,
      deletions,
      url: pr.html_url,
      event_at: eventAt,
    };

    await eventsRepository.storePullRequest(prData);

    // Post to Telegram channel
    await channelService.postPullRequestEvent({
      org,
      repo,
      number: pr.number,
      title: pr.title,
      author,
      action,
      merged,
      url: pr.html_url,
    });

    logger.info('Processed pull request event', {
      org,
      repo,
      number: pr.number,
      action,
      merged,
    });
  } catch (error) {
    logger.error('Error handling pull request event', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
