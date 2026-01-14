export interface GitHubWebhookPayload {
  [key: string]: unknown;
}

export interface PushEventPayload {
  ref: string;
  repository: {
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  pusher: {
    name: string;
  };
  commits: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      username?: string;
    };
    url: string;
    added?: string[];
    removed?: string[];
    modified?: string[];
  }>;
  sender: {
    login: string;
  };
}

export interface PullRequestEventPayload {
  action: string;
  pull_request: {
    id: number;
    number: number;
    title: string;
    state: string;
    merged: boolean;
    user: {
      login: string;
    };
    head: {
      ref: string;
    };
    base: {
      ref: string;
    };
    html_url: string;
    additions?: number;
    deletions?: number;
    created_at?: string;
    updated_at?: string;
  };
  repository: {
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  sender: {
    login: string;
  };
}

export interface ReviewEventPayload {
  action: string;
  review: {
    id: number;
    state: string; // approved, changes_requested, commented
    user: {
      login: string;
    };
    html_url: string;
    submitted_at: string;
  };
  pull_request: {
    number: number;
  };
  repository: {
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  sender: {
    login: string;
  };
}

export interface IssueEventPayload {
  action: string;
  issue: {
    id: number;
    number: number;
    title: string;
    state: string;
    user: {
      login: string;
    };
    html_url: string;
    created_at?: string;
    updated_at?: string;
  };
  repository: {
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  sender: {
    login: string;
  };
}

export interface IssueCommentEventPayload {
  action: string;
  comment: {
    id: number;
    user: {
      login: string;
    };
    html_url: string;
    created_at: string;
  };
  issue: {
    number: number;
  };
  repository: {
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  sender: {
    login: string;
  };
}
