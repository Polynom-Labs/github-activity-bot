-- Core event tables
CREATE TABLE github_events (
    id SERIAL PRIMARY KEY,
    delivery_id VARCHAR(64) UNIQUE NOT NULL,  -- For idempotency
    event_type VARCHAR(32) NOT NULL,
    org VARCHAR(64) NOT NULL,
    repo VARCHAR(128) NOT NULL,
    sender VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_github_events_delivery_id ON github_events(delivery_id);
CREATE INDEX idx_github_events_org_repo ON github_events(org, repo);
CREATE INDEX idx_github_events_created_at ON github_events(created_at);

CREATE TABLE commits (
    id SERIAL PRIMARY KEY,
    sha VARCHAR(64) UNIQUE NOT NULL,
    org VARCHAR(64) NOT NULL,
    repo VARCHAR(128) NOT NULL,
    branch VARCHAR(256) NOT NULL,
    author VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    url VARCHAR(512),
    additions INT DEFAULT 0,
    deletions INT DEFAULT 0,
    pushed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commits_sha ON commits(sha);
CREATE INDEX idx_commits_org_repo ON commits(org, repo);
CREATE INDEX idx_commits_author ON commits(author);
CREATE INDEX idx_commits_pushed_at ON commits(pushed_at);
-- Composite index for author + date range queries (common in stats)
CREATE INDEX idx_commits_author_pushed_at ON commits(author, pushed_at);
-- Composite index for org/repo + date range queries
CREATE INDEX idx_commits_org_repo_pushed_at ON commits(org, repo, pushed_at);

CREATE TABLE pull_requests (
    id SERIAL PRIMARY KEY,
    gh_id BIGINT NOT NULL,
    org VARCHAR(64) NOT NULL,
    repo VARCHAR(128) NOT NULL,
    number INT NOT NULL,
    title TEXT NOT NULL,
    author VARCHAR(64) NOT NULL,
    state VARCHAR(16) NOT NULL,
    action VARCHAR(32) NOT NULL,
    merged BOOLEAN DEFAULT FALSE,
    additions INT DEFAULT 0,
    deletions INT DEFAULT 0,
    url VARCHAR(512),
    event_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org, repo, number, action, event_at)
);

CREATE INDEX idx_pull_requests_org_repo_number ON pull_requests(org, repo, number);
CREATE INDEX idx_pull_requests_author ON pull_requests(author);
CREATE INDEX idx_pull_requests_state ON pull_requests(state);
CREATE INDEX idx_pull_requests_event_at ON pull_requests(event_at);
-- Composite index for author + date range queries
CREATE INDEX idx_pull_requests_author_event_at ON pull_requests(author, event_at);
-- Partial index for open PRs (common in alert checker)
CREATE INDEX idx_pull_requests_open_no_review ON pull_requests(org, repo, number, event_at) 
  WHERE state = 'open' AND action = 'opened';
-- Composite index for merged PRs with date (for LOC stats)
CREATE INDEX idx_pull_requests_merged_event_at ON pull_requests(event_at, additions, deletions) 
  WHERE merged = true;

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    org VARCHAR(64) NOT NULL,
    repo VARCHAR(128) NOT NULL,
    pr_number INT NOT NULL,
    reviewer VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL,  -- approved, changes_requested, commented
    url VARCHAR(512),
    submitted_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_org_repo_pr ON reviews(org, repo, pr_number);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer);
CREATE INDEX idx_reviews_submitted_at ON reviews(submitted_at);
-- Composite index for reviewer + date range queries
CREATE INDEX idx_reviews_reviewer_submitted_at ON reviews(reviewer, submitted_at);
-- Composite index for org/repo/pr + submitted_at (for alert checker)
CREATE INDEX idx_reviews_org_repo_pr_submitted ON reviews(org, repo, pr_number, submitted_at);

CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    gh_id BIGINT NOT NULL,
    org VARCHAR(64) NOT NULL,
    repo VARCHAR(128) NOT NULL,
    number INT NOT NULL,
    title TEXT NOT NULL,
    author VARCHAR(64) NOT NULL,
    state VARCHAR(16) NOT NULL,
    action VARCHAR(32) NOT NULL,
    url VARCHAR(512),
    event_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issues_org_repo_number ON issues(org, repo, number);
CREATE INDEX idx_issues_author ON issues(author);
CREATE INDEX idx_issues_event_at ON issues(event_at);
-- Composite index for author + date range queries
CREATE INDEX idx_issues_author_event_at ON issues(author, event_at);

CREATE TABLE issue_comments (
    id SERIAL PRIMARY KEY,
    org VARCHAR(64) NOT NULL,
    repo VARCHAR(128) NOT NULL,
    issue_number INT NOT NULL,
    author VARCHAR(64) NOT NULL,
    url VARCHAR(512),
    commented_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issue_comments_org_repo_issue ON issue_comments(org, repo, issue_number);
CREATE INDEX idx_issue_comments_author ON issue_comments(author);
CREATE INDEX idx_issue_comments_commented_at ON issue_comments(commented_at);
-- Composite index for author + date range queries
CREATE INDEX idx_issue_comments_author_commented_at ON issue_comments(author, commented_at);

-- User mapping table
CREATE TABLE user_mappings (
    id SERIAL PRIMARY KEY,
    github_username VARCHAR(64) UNIQUE NOT NULL,
    telegram_user_id BIGINT,
    telegram_username VARCHAR(64),
    is_whitelisted BOOLEAN DEFAULT FALSE,  -- For alerts
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_mappings_github_username ON user_mappings(github_username);
CREATE INDEX idx_user_mappings_telegram_user_id ON user_mappings(telegram_user_id);
CREATE INDEX idx_user_mappings_whitelisted ON user_mappings(is_whitelisted);

-- Settings table (key-value for runtime config)
CREATE TABLE settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on JSONB value for faster lookups (if needed)
CREATE INDEX idx_settings_value ON settings USING GIN (value);
