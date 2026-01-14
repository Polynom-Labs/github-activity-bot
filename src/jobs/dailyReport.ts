import { getTeamStats, getTopContributors, getTopRepos } from '../domain/stats';
import { postToChannel } from '../telegram/channel';
import { logger } from '../utils/logger';

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

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export async function generateDailyReport(): Promise<void> {
  try {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    const teamStats = await getTeamStats(start, end);
    const topContributors = await getTopContributors(start, end, 5);
    const topRepos = await getTopRepos(start, end, 5);

    const dateStr = formatDate(start);

    let message = `📊 *Daily Activity Report* \\(${escapeMarkdown(dateStr)}\\)\n\n` +
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

    await postToChannel(message);
    logger.info('Daily report generated and sent', { date: dateStr });
  } catch (error) {
    logger.error('Failed to generate daily report', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
