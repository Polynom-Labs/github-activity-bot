import { IssueCommentEventPayload } from '../../domain/types';
import { eventsRepository, IssueComment } from '../../db/repositories/events';
import { channelService } from '../../telegram/channel';
import { logger } from '../../utils/logger';

export async function handleIssueCommentEvent(
  payload: IssueCommentEventPayload,
  org: string,
  repo: string
): Promise<void> {
  try {
    const action = payload.action;
    if (!action || action !== 'created') {
      logger.debug('Ignoring comment action', { action });
      return;
    }

    const comment = payload.comment;
    if (!comment) {
      logger.warn('Comment event missing comment data');
      return;
    }
    const issueNumber = payload.issue?.number;
    if (!issueNumber) {
      logger.warn('Comment event missing issue number');
      return;
    }

    const author = comment.user?.login || 'unknown';
    const commentedAt = new Date(comment.created_at || new Date());

    const commentData: Omit<IssueComment, 'id' | 'created_at'> = {
      org,
      repo,
      issue_number: issueNumber,
      author,
      url: comment.html_url,
      commented_at: commentedAt,
    };

    await eventsRepository.storeIssueComment(commentData);

    // Post to Telegram channel
    await channelService.postIssueCommentEvent({
      org,
      repo,
      issueNumber,
      author,
      url: comment.html_url,
    });

    logger.info('Processed issue comment event', {
      org,
      repo,
      issueNumber,
      author,
    });
  } catch (error) {
    logger.error('Error handling issue comment event', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
