import { IssueEventPayload } from '../../domain/types';
import { eventsRepository, Issue } from '../../db/repositories/events';
import { channelService } from '../../telegram/channel';
import { logger } from '../../utils/logger';

export async function handleIssueEvent(
  payload: IssueEventPayload,
  org: string,
  repo: string
): Promise<void> {
  try {
    const action = payload.action;
    if (!action || !['opened', 'closed', 'reopened'].includes(action)) {
      logger.debug('Ignoring issue action', { action });
      return;
    }

    const issue = payload.issue;
    if (!issue) {
      logger.warn('Issue event missing issue data');
      return;
    }
    const author = issue.user?.login || 'unknown';
    const state = issue.state || 'open';
    const eventAt = new Date(issue.updated_at || issue.created_at || new Date());

    const issueData: Omit<Issue, 'id' | 'created_at'> = {
      gh_id: issue.id,
      org,
      repo,
      number: issue.number,
      title: issue.title,
      author,
      state,
      action,
      url: issue.html_url,
      event_at: eventAt,
    };

    await eventsRepository.storeIssue(issueData);

    // Post to Telegram channel
    await channelService.postIssueEvent({
      org,
      repo,
      number: issue.number,
      title: issue.title,
      author,
      action,
      url: issue.html_url,
    });

    logger.info('Processed issue event', {
      org,
      repo,
      number: issue.number,
      action,
    });
  } catch (error) {
    logger.error('Error handling issue event', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
