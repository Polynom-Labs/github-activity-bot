import { getOpenPRsWithoutRecentReviews } from '../db/repositories/events';
import { getWhitelistedUsers, getUserMapping } from '../db/repositories/users';
import {
  getSetting,
  DEFAULT_PR_REVIEW_ALERT_HOURS_KEY,
} from '../db/repositories/settings';
import { postToChannel } from '../telegram/channel';
import { logger } from '../utils/logger';
import { config } from '../config';

function escapeMarkdown(text: string): string {
  return text
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|');
}

function formatHoursAgo(hours: number): string {
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) {
    return `${days}d`;
  }
  return `${days}d ${remainingHours}h`;
}

export async function checkAndSendAlerts(): Promise<void> {
  try {
    // Get threshold from settings or use default
    const thresholdSetting = await getSetting(DEFAULT_PR_REVIEW_ALERT_HOURS_KEY);
    const thresholdHours =
      thresholdSetting && typeof thresholdSetting === 'number'
        ? thresholdSetting
        : config.defaults.prReviewAlertHours;

    // Get whitelisted users
    const whitelistedUsers = await getWhitelistedUsers();
    const whitelistedUsernames = new Set(
      whitelistedUsers.map((u) => u.github_username.toLowerCase())
    );

    if (whitelistedUsernames.size === 0) {
      logger.debug('No whitelisted users, skipping alert check');
      return;
    }

    // Get open PRs without recent reviews
    const stalePRs = await getOpenPRsWithoutRecentReviews(thresholdHours);

    // Filter to only whitelisted members
    const alertsToSend = stalePRs.filter((pr) =>
      whitelistedUsernames.has(pr.author.toLowerCase())
    );

    if (alertsToSend.length === 0) {
      logger.debug('No stale PRs found for whitelisted users');
      return;
    }

    logger.info('Found stale PRs for alerts', {
      count: alertsToSend.length,
      thresholdHours,
    });

    // Send alerts
    for (const pr of alertsToSend) {
      try {
        const hoursSinceOpened =
          (Date.now() - pr.event_at.getTime()) / (1000 * 60 * 60);
        const timeAgo = formatHoursAgo(hoursSinceOpened);

        // Get user mapping for potential Telegram mention
        const userMapping = await getUserMapping(pr.author);
        const mention =
          userMapping?.telegram_user_id
            ? `@${userMapping.telegram_username || pr.author}`
            : `@${escapeMarkdown(pr.author)}`;

        const repoName = `${pr.org}/${pr.repo}`;
        const message =
          `⚠️ *PR Review Alert*\n\n` +
          `PR #${pr.number} in *${escapeMarkdown(repoName)}* has been waiting for review for ${timeAgo}\n` +
          `Author: ${mention}\n` +
          `"${escapeMarkdown(pr.title)}"\n` +
          `${escapeMarkdown(pr.url || '')}`;

        await postToChannel(message);
        logger.info('Sent PR review alert', {
          org: pr.org,
          repo: pr.repo,
          prNumber: pr.number,
          author: pr.author,
          hoursSinceOpened: Math.round(hoursSinceOpened),
        });
      } catch (error) {
        logger.error('Failed to send alert for PR', {
          org: pr.org,
          repo: pr.repo,
          prNumber: pr.number,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  } catch (error) {
    logger.error('Error checking alerts', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
