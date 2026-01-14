import { query, queryOne } from '../index';
import { logger } from '../../utils/logger';

export interface GitHubEvent {
  id: number;
  delivery_id: string;
  event_type: string;
  org: string;
  repo: string;
  sender: string;
  payload: Record<string, unknown>;
  created_at: Date;
}

export interface Commit {
  id: number;
  sha: string;
  org: string;
  repo: string;
  branch: string;
  author: string;
  message: string;
  url: string | null;
  additions: number;
  deletions: number;
  pushed_at: Date;
  created_at: Date;
}

export interface PullRequest {
  id: number;
  gh_id: number;
  org: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  state: string;
  action: string;
  merged: boolean;
  additions: number;
  deletions: number;
  url: string | null;
  event_at: Date;
  created_at: Date;
}

export interface Review {
  id: number;
  org: string;
  repo: string;
  pr_number: number;
  reviewer: string;
  state: string;
  url: string | null;
  submitted_at: Date;
  created_at: Date;
}

export interface Issue {
  id: number;
  gh_id: number;
  org: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  state: string;
  action: string;
  url: string | null;
  event_at: Date;
  created_at: Date;
}

export interface IssueComment {
  id: number;
  org: string;
  repo: string;
  issue_number: number;
  author: string;
  url: string | null;
  commented_at: Date;
  created_at: Date;
}

export async function storeGitHubEvent(
  deliveryId: string,
  eventType: string,
  org: string,
  repo: string,
  sender: string,
  payload: Record<string, unknown>
): Promise<number> {
  try {
    const result = await query<{ id: number }>(
      `INSERT INTO github_events (delivery_id, event_type, org, repo, sender, payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [deliveryId, eventType, org, repo, sender, JSON.stringify(payload)]
    );
    return result[0].id;
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      logger.warn('Duplicate webhook delivery', { deliveryId });
      throw new Error('Duplicate delivery ID');
    }
    throw error;
  }
}

export async function checkDeliveryIdExists(deliveryId: string): Promise<boolean> {
  const result = await queryOne<{ count: string }>(
    'SELECT 1 FROM github_events WHERE delivery_id = $1',
    [deliveryId]
  );
  return result !== null;
}

export async function storeCommit(commit: Omit<Commit, 'id' | 'created_at'>): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO commits (sha, org, repo, branch, author, message, url, additions, deletions, pushed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (sha) DO NOTHING
     RETURNING id`,
    [
      commit.sha,
      commit.org,
      commit.repo,
      commit.branch,
      commit.author,
      commit.message,
      commit.url,
      commit.additions,
      commit.deletions,
      commit.pushed_at,
    ]
  );
  return result.length > 0 ? result[0].id : 0;
}

export async function storePullRequest(
  pr: Omit<PullRequest, 'id' | 'created_at'>
): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO pull_requests 
     (gh_id, org, repo, number, title, author, state, action, merged, additions, deletions, url, event_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (org, repo, number, action, event_at) DO NOTHING
     RETURNING id`,
    [
      pr.gh_id,
      pr.org,
      pr.repo,
      pr.number,
      pr.title,
      pr.author,
      pr.state,
      pr.action,
      pr.merged,
      pr.additions,
      pr.deletions,
      pr.url,
      pr.event_at,
    ]
  );
  return result.length > 0 ? result[0].id : 0;
}

export async function storeReview(review: Omit<Review, 'id' | 'created_at'>): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO reviews (org, repo, pr_number, reviewer, state, url, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      review.org,
      review.repo,
      review.pr_number,
      review.reviewer,
      review.state,
      review.url,
      review.submitted_at,
    ]
  );
  return result[0].id;
}

export async function storeIssue(issue: Omit<Issue, 'id' | 'created_at'>): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO issues (gh_id, org, repo, number, title, author, state, action, url, event_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      issue.gh_id,
      issue.org,
      issue.repo,
      issue.number,
      issue.title,
      issue.author,
      issue.state,
      issue.action,
      issue.url,
      issue.event_at,
    ]
  );
  return result[0].id;
}

export async function storeIssueComment(
  comment: Omit<IssueComment, 'id' | 'created_at'>
): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO issue_comments (org, repo, issue_number, author, url, commented_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      comment.org,
      comment.repo,
      comment.issue_number,
      comment.author,
      comment.url,
      comment.commented_at,
    ]
  );
  return result[0].id;
}

export async function getOpenPRsWithoutRecentReviews(
  hoursThreshold: number
): Promise<PullRequest[]> {
  const thresholdTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
  
  // Optimized query using LEFT JOIN instead of NOT EXISTS for better performance
  // The partial index on open PRs will help here
  return query<PullRequest>(
    `SELECT DISTINCT pr.* 
     FROM pull_requests pr
     LEFT JOIN reviews r ON r.org = pr.org 
       AND r.repo = pr.repo 
       AND r.pr_number = pr.number
       AND r.submitted_at > pr.event_at
     WHERE pr.state = 'open' 
       AND pr.action = 'opened'
       AND pr.event_at < $1
       AND r.id IS NULL
     ORDER BY pr.event_at ASC`,
    [thresholdTime]
  );
}

// Wrapper object for backward compatibility
export const eventsRepository = {
  storeCommit,
  storePullRequest,
  storeReview,
  storeIssue,
  storeIssueComment,
};
