import { Commit } from '../db/repositories/events';

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
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

export function formatPushMessage(
  org: string,
  repo: string,
  branch: string,
  pusher: string,
  commits: Commit[]
): string {
  const repoName = `${org}/${repo}`;
  const commitLines = commits
    .slice(0, 10) // Limit to 10 commits per message
    .map((c) => `• ${escapeMarkdown(c.sha)} - ${escapeMarkdown(c.message)}`)
    .join('\n');

  const moreCount = commits.length > 10 ? `\n_...and ${commits.length - 10} more_` : '';

  return `🔨 *${escapeMarkdown(repoName)}* \`${escapeMarkdown(branch)}\` pushed ${commits.length} commit${commits.length !== 1 ? 's' : ''} by @${escapeMarkdown(pusher)}\n\n${commitLines}${moreCount}`;
}

export function formatPullRequestMessage(
  action: string,
  org: string,
  repo: string,
  number: number,
  title: string,
  author: string,
  url: string,
  merged: boolean
): string {
  const repoName = `${org}/${repo}`;
  const emoji = merged ? '✅' : action === 'opened' ? '📝' : '🔒';
  const actionText = merged ? 'merged' : action === 'opened' ? 'opened' : 'closed';

  return `${emoji} *${escapeMarkdown(repoName)}* PR #${number} ${actionText} by @${escapeMarkdown(author)}\n"${escapeMarkdown(title)}"\n${escapeMarkdown(url)}`;
}

export function formatReviewMessage(
  org: string,
  repo: string,
  prNumber: number,
  reviewer: string,
  state: string,
  url: string
): string {
  const repoName = `${org}/${repo}`;
  const emoji =
    state === 'approved' ? '✅' : state === 'changes_requested' ? '🔄' : '💬';
  const stateText =
    state === 'approved'
      ? 'approved'
      : state === 'changes_requested'
      ? 'requested changes'
      : 'commented on';

  return `${emoji} *${escapeMarkdown(repoName)}* PR #${prNumber} ${stateText} by @${escapeMarkdown(reviewer)}\n${escapeMarkdown(url)}`;
}

export function formatIssueMessage(
  action: string,
  org: string,
  repo: string,
  number: number,
  title: string,
  author: string,
  url: string
): string {
  const repoName = `${org}/${repo}`;
  const emoji = action === 'opened' ? '📌' : action === 'closed' ? '✅' : '🔄';
  const actionText = action === 'opened' ? 'opened' : action === 'closed' ? 'closed' : 'reopened';

  return `${emoji} *${escapeMarkdown(repoName)}* Issue #${number} ${actionText} by @${escapeMarkdown(author)}\n"${escapeMarkdown(title)}"\n${escapeMarkdown(url)}`;
}

export function formatIssueCommentMessage(
  org: string,
  repo: string,
  issueNumber: number,
  author: string,
  url: string
): string {
  const repoName = `${org}/${repo}`;

  return `💬 *${escapeMarkdown(repoName)}* Comment on issue #${issueNumber} by @${escapeMarkdown(author)}\n${escapeMarkdown(url)}`;
}
