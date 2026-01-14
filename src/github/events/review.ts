import { ReviewEventPayload } from '../../domain/types';
import { eventsRepository, Review } from '../../db/repositories/events';
import { channelService } from '../../telegram/channel';
import { logger } from '../../utils/logger';

export async function handleReviewEvent(
  payload: ReviewEventPayload,
  org: string,
  repo: string
): Promise<void> {
  try {
    const action = payload.action;
    if (!action || action !== 'submitted') {
      logger.debug('Ignoring review action', { action });
      return;
    }

    const review = payload.review;
    if (!review) {
      logger.warn('Review event missing review data');
      return;
    }
    const prNumber = payload.pull_request?.number;
    if (!prNumber) {
      logger.warn('Review event missing PR number');
      return;
    }

    const reviewer = review.user?.login || 'unknown';
    const state = review.state || 'commented';
    const submittedAt = new Date(review.submitted_at || new Date());

    const reviewData: Omit<Review, 'id' | 'created_at'> = {
      org,
      repo,
      pr_number: prNumber,
      reviewer,
      state,
      url: review.html_url,
      submitted_at: submittedAt,
    };

    await eventsRepository.storeReview(reviewData);

    // Post to Telegram channel
    await channelService.postReviewEvent({
      org,
      repo,
      prNumber,
      reviewer,
      state,
      url: review.html_url,
    });

    logger.info('Processed review event', {
      org,
      repo,
      prNumber,
      reviewer,
      state,
    });
  } catch (error) {
    logger.error('Error handling review event', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
