import { query } from '../db/index';

export interface UserStats {
  github_username: string;
  commits: number;
  prs_opened: number;
  prs_merged: number;
  prs_closed: number;
  reviews_approved: number;
  reviews_changes: number;
  reviews_commented: number;
  issues_opened: number;
  issues_closed: number;
  comments: number;
}

export interface TeamStats {
  total_commits: number;
  total_prs_opened: number;
  total_prs_merged: number;
  total_prs_closed: number;
  total_reviews: number;
  total_reviews_approved: number;
  total_reviews_changes: number;
  total_reviews_commented: number;
  total_issues_opened: number;
  total_issues_closed: number;
  total_comments: number;
  total_additions: number;
  total_deletions: number;
}

export interface RepoStats {
  org: string;
  repo: string;
  commits: number;
}

export async function getUserStats(
  githubUsername: string,
  startDate: Date,
  endDate: Date
): Promise<UserStats> {
  // Optimized query using CTEs to avoid multiple table scans
  const result = await query<UserStats>(
    `
    WITH user_commits AS (
      SELECT COUNT(*) as count FROM commits 
      WHERE author = $1 AND pushed_at BETWEEN $2 AND $3
    ),
    user_prs AS (
      SELECT 
        COUNT(*) FILTER (WHERE action = 'opened') as opened,
        COUNT(*) FILTER (WHERE merged = true) as merged,
        COUNT(*) FILTER (WHERE action = 'closed' AND merged = false) as closed
      FROM pull_requests 
      WHERE author = $1 AND event_at BETWEEN $2 AND $3
    ),
    user_reviews AS (
      SELECT 
        COUNT(*) FILTER (WHERE state = 'approved') as approved,
        COUNT(*) FILTER (WHERE state = 'changes_requested') as changes,
        COUNT(*) FILTER (WHERE state = 'commented') as commented
      FROM reviews 
      WHERE reviewer = $1 AND submitted_at BETWEEN $2 AND $3
    ),
    user_issues AS (
      SELECT 
        COUNT(*) FILTER (WHERE action = 'opened') as opened,
        COUNT(*) FILTER (WHERE action = 'closed') as closed
      FROM issues 
      WHERE author = $1 AND event_at BETWEEN $2 AND $3
    ),
    user_comments AS (
      SELECT COUNT(*) as count FROM issue_comments 
      WHERE author = $1 AND commented_at BETWEEN $2 AND $3
    )
    SELECT
      $1::text as github_username,
      COALESCE(uc.count, 0)::int as commits,
      COALESCE(up.opened, 0)::int as prs_opened,
      COALESCE(up.merged, 0)::int as prs_merged,
      COALESCE(up.closed, 0)::int as prs_closed,
      COALESCE(ur.approved, 0)::int as reviews_approved,
      COALESCE(ur.changes, 0)::int as reviews_changes,
      COALESCE(ur.commented, 0)::int as reviews_commented,
      COALESCE(ui.opened, 0)::int as issues_opened,
      COALESCE(ui.closed, 0)::int as issues_closed,
      COALESCE(ucm.count, 0)::int as comments
    FROM user_commits uc
    CROSS JOIN user_prs up
    CROSS JOIN user_reviews ur
    CROSS JOIN user_issues ui
    CROSS JOIN user_comments ucm
    `,
    [githubUsername, startDate, endDate]
  );

  return result[0];
}

export async function getTeamStats(
  startDate: Date,
  endDate: Date
): Promise<TeamStats> {
  // Optimized query using CTEs and aggregations to avoid multiple table scans
  const result = await query<TeamStats>(
    `
    WITH commits_stats AS (
      SELECT COUNT(*) as count FROM commits 
      WHERE pushed_at BETWEEN $1 AND $2
    ),
    prs_stats AS (
      SELECT 
        COUNT(*) FILTER (WHERE action = 'opened') as opened,
        COUNT(*) FILTER (WHERE merged = true) as merged,
        COUNT(*) FILTER (WHERE action = 'closed' AND merged = false) as closed,
        COALESCE(SUM(additions) FILTER (WHERE merged = true), 0) as additions,
        COALESCE(SUM(deletions) FILTER (WHERE merged = true), 0) as deletions
      FROM pull_requests 
      WHERE event_at BETWEEN $1 AND $2
    ),
    reviews_stats AS (
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE state = 'approved') as approved,
        COUNT(*) FILTER (WHERE state = 'changes_requested') as changes,
        COUNT(*) FILTER (WHERE state = 'commented') as commented
      FROM reviews 
      WHERE submitted_at BETWEEN $1 AND $2
    ),
    issues_stats AS (
      SELECT 
        COUNT(*) FILTER (WHERE action = 'opened') as opened,
        COUNT(*) FILTER (WHERE action = 'closed') as closed
      FROM issues 
      WHERE event_at BETWEEN $1 AND $2
    ),
    comments_stats AS (
      SELECT COUNT(*) as count FROM issue_comments 
      WHERE commented_at BETWEEN $1 AND $2
    )
    SELECT
      COALESCE(cs.count, 0)::int as total_commits,
      COALESCE(prs.opened, 0)::int as total_prs_opened,
      COALESCE(prs.merged, 0)::int as total_prs_merged,
      COALESCE(prs.closed, 0)::int as total_prs_closed,
      COALESCE(rs.total, 0)::int as total_reviews,
      COALESCE(rs.approved, 0)::int as total_reviews_approved,
      COALESCE(rs.changes, 0)::int as total_reviews_changes,
      COALESCE(rs.commented, 0)::int as total_reviews_commented,
      COALESCE(iss.opened, 0)::int as total_issues_opened,
      COALESCE(iss.closed, 0)::int as total_issues_closed,
      COALESCE(cms.count, 0)::int as total_comments,
      COALESCE(prs.additions, 0)::bigint as total_additions,
      COALESCE(prs.deletions, 0)::bigint as total_deletions
    FROM commits_stats cs
    CROSS JOIN prs_stats prs
    CROSS JOIN reviews_stats rs
    CROSS JOIN issues_stats iss
    CROSS JOIN comments_stats cms
    `,
    [startDate, endDate]
  );

  return result[0];
}

export async function getTopContributors(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<Array<{ github_username: string; commits: number; prs_merged: number; reviews: number }>> {
  // Optimized query using UNION ALL and aggregations
  const result = await query<{
    github_username: string;
    commits: number;
    prs_merged: number;
    reviews: number;
  }>(
    `
    WITH contributor_commits AS (
      SELECT author as github_username, COUNT(*) as commits
      FROM commits
      WHERE pushed_at BETWEEN $1 AND $2
      GROUP BY author
    ),
    contributor_prs AS (
      SELECT author as github_username, COUNT(*) as prs_merged
      FROM pull_requests
      WHERE merged = true AND event_at BETWEEN $1 AND $2
      GROUP BY author
    ),
    contributor_reviews AS (
      SELECT reviewer as github_username, COUNT(*) as reviews
      FROM reviews
      WHERE submitted_at BETWEEN $1 AND $2
      GROUP BY reviewer
    ),
    all_contributors AS (
      SELECT github_username FROM contributor_commits
      UNION
      SELECT github_username FROM contributor_prs
      UNION
      SELECT github_username FROM contributor_reviews
    )
    SELECT
      ac.github_username,
      COALESCE(cc.commits, 0)::int as commits,
      COALESCE(cp.prs_merged, 0)::int as prs_merged,
      COALESCE(cr.reviews, 0)::int as reviews
    FROM all_contributors ac
    LEFT JOIN contributor_commits cc ON cc.github_username = ac.github_username
    LEFT JOIN contributor_prs cp ON cp.github_username = ac.github_username
    LEFT JOIN contributor_reviews cr ON cr.github_username = ac.github_username
    ORDER BY commits DESC, prs_merged DESC, reviews DESC
    LIMIT $3
    `,
    [startDate, endDate, limit]
  );

  return result;
}

export async function getTopRepos(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<RepoStats[]> {
  const result = await query<RepoStats>(
    `
    SELECT
      org,
      repo,
      COUNT(*) as commits
    FROM commits
    WHERE pushed_at BETWEEN $1 AND $2
    GROUP BY org, repo
    ORDER BY commits DESC
    LIMIT $3
    `,
    [startDate, endDate, limit]
  );

  return result;
}
