import { query } from '../db/index';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Cleanup old data to keep database size manageable
 * Keeps:
 * - Raw events: 90 days
 * - Commits: 365 days (for historical reports)
 * - PRs/Reviews/Issues/Comments: 365 days
 * 
 * This can be customized via environment variables
 */
const DEFAULT_RETENTION_DAYS = {
  rawEvents: 90,
  activityData: 365,
};

export async function cleanupOldData(): Promise<void> {
  try {
    const rawEventsRetention = parseInt(
      process.env.DATA_RETENTION_RAW_EVENTS_DAYS || String(DEFAULT_RETENTION_DAYS.rawEvents),
      10
    );
    const activityRetention = parseInt(
      process.env.DATA_RETENTION_ACTIVITY_DAYS || String(DEFAULT_RETENTION_DAYS.activityData),
      10
    );

    const rawEventsCutoff = new Date();
    rawEventsCutoff.setDate(rawEventsCutoff.getDate() - rawEventsRetention);

    const activityCutoff = new Date();
    activityCutoff.setDate(activityCutoff.getDate() - activityRetention);

    logger.info('Starting data cleanup', {
      rawEventsRetentionDays: rawEventsRetention,
      activityRetentionDays: activityRetention,
    });

    // Delete old raw events (we keep structured data, so raw events can be purged earlier)
    const rawEventsDeleted = await query<{ id: number }>(
      `DELETE FROM github_events WHERE created_at < $1 RETURNING id`,
      [rawEventsCutoff]
    );
    const rawEventsCount = rawEventsDeleted.length;

    // Delete old commits
    const commitsDeleted = await query<{ id: number }>(
      `DELETE FROM commits WHERE pushed_at < $1 RETURNING id`,
      [activityCutoff]
    );
    const commitsCount = commitsDeleted.length;

    // Delete old pull requests
    const prsDeleted = await query<{ id: number }>(
      `DELETE FROM pull_requests WHERE event_at < $1 RETURNING id`,
      [activityCutoff]
    );
    const prsCount = prsDeleted.length;

    // Delete old reviews
    const reviewsDeleted = await query<{ id: number }>(
      `DELETE FROM reviews WHERE submitted_at < $1 RETURNING id`,
      [activityCutoff]
    );
    const reviewsCount = reviewsDeleted.length;

    // Delete old issues
    const issuesDeleted = await query<{ id: number }>(
      `DELETE FROM issues WHERE event_at < $1 RETURNING id`,
      [activityCutoff]
    );
    const issuesCount = issuesDeleted.length;

    // Delete old issue comments
    const commentsDeleted = await query<{ id: number }>(
      `DELETE FROM issue_comments WHERE commented_at < $1 RETURNING id`,
      [activityCutoff]
    );
    const commentsCount = commentsDeleted.length;

    logger.info('Data cleanup completed', {
      rawEventsDeleted: rawEventsCount,
      commitsDeleted: commitsCount,
      prsDeleted: prsCount,
      reviewsDeleted: reviewsCount,
      issuesDeleted: issuesCount,
      commentsDeleted: commentsCount,
      totalDeleted:
        rawEventsCount +
        commitsCount +
        prsCount +
        reviewsCount +
        issuesCount +
        commentsCount,
    });
  } catch (error) {
    logger.error('Error during data cleanup', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
