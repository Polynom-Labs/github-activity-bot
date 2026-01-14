import TelegramBot from 'node-telegram-bot-api';
import { getUserStats, getTeamStats, getTopContributors, getTopRepos } from '../../domain/stats';
import { config } from '../../config';
import { logger } from '../../utils/logger';

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

function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      // Default to today
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export async function handleStatsCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  args: string[]
): Promise<void> {
  // Check if message is from admin group
  if (msg.chat.id.toString() !== config.telegram.adminGroupId) {
    return;
  }

  try {
    const period = args[1] || 'today';
    const githubUser = args[0];

    const { start, end } = getDateRange(period);

    if (githubUser) {
      // User-specific stats
      const stats = await getUserStats(githubUser, start, end);
      const periodText = period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month';

      const message = `📊 *Stats for @${escapeMarkdown(githubUser)}* \\(${periodText}\\)\n\n` +
        `• Commits: ${stats.commits}\n` +
        `• PRs Opened: ${stats.prs_opened} \\| Merged: ${stats.prs_merged} \\| Closed: ${stats.prs_closed}\n` +
        `• Reviews: ${stats.reviews_approved + stats.reviews_changes + stats.reviews_commented} \\(✅${stats.reviews_approved} approve, 🔄${stats.reviews_changes} changes, 💬${stats.reviews_commented} comment\\)\n` +
        `• Issues Opened: ${stats.issues_opened} \\| Closed: ${stats.issues_closed}\n` +
        `• Comments: ${stats.comments}`;

      await bot.sendMessage(msg.chat.id, message, { parse_mode: 'MarkdownV2' });
    } else {
      // Team stats
      const teamStats = await getTeamStats(start, end);
      const topContributors = await getTopContributors(start, end, 5);
      const topRepos = await getTopRepos(start, end, 5);
      const periodText = period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month';

      let message = `📊 *Team Activity Report* \\(${periodText}\\)\n\n` +
        `*Team Totals:*\n` +
        `• Commits: ${teamStats.total_commits}\n` +
        `• PRs Opened: ${teamStats.total_prs_opened} \\| Merged: ${teamStats.total_prs_merged} \\| Closed: ${teamStats.total_prs_closed}\n` +
        `• Reviews: ${teamStats.total_reviews} \\(✅${teamStats.total_reviews_approved} approve, 🔄${teamStats.total_reviews_changes} changes, 💬${teamStats.total_reviews_commented} comment\\)\n` +
        `• Issues Opened: ${teamStats.total_issues_opened} \\| Closed: ${teamStats.total_issues_closed}\n` +
        `• Comments: ${teamStats.total_comments}\n\n`;

      if (topContributors.length > 0) {
        message += `*Top Contributors:*\n`;
        topContributors.forEach((contributor, idx) => {
          message += `${idx + 1}\\. @${escapeMarkdown(contributor.github_username)} \\- ${contributor.commits} commits, ${contributor.prs_merged} PRs merged\n`;
        });
        message += '\n';
      }

      if (topRepos.length > 0) {
        message += `*Top Repos:*\n`;
        topRepos.forEach((repo, idx) => {
          message += `${idx + 1}\\. ${escapeMarkdown(repo.org)}/${escapeMarkdown(repo.repo)} \\- ${repo.commits} commits\n`;
        });
      }

      await bot.sendMessage(msg.chat.id, message, { parse_mode: 'MarkdownV2' });
    }
  } catch (error) {
    logger.error('Error in stats command', { error: error instanceof Error ? error.message : String(error) });
    await bot.sendMessage(msg.chat.id, 'Error fetching stats. Please try again.');
  }
}
