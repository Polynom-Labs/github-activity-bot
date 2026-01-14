import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { logger } from '../utils/logger';

let bot: TelegramBot | null = null;
const RATE_LIMIT_MS = 3000; // ~20 messages per minute (3000ms = 3 seconds between messages)
let lastSentTime = 0;

function getBot(): TelegramBot {
  if (!bot) {
    bot = new TelegramBot(config.telegram.botToken, { polling: false });
  }
  return bot;
}

async function sendMessageWithRateLimit(message: string): Promise<void> {
  const now = Date.now();
  const timeSinceLastMessage = now - lastSentTime;

  if (timeSinceLastMessage < RATE_LIMIT_MS) {
    const delay = RATE_LIMIT_MS - timeSinceLastMessage;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  try {
    await getBot().sendMessage(config.telegram.channelId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
    lastSentTime = Date.now();
    logger.debug('Message sent to Telegram channel', {
      messageLength: message.length,
    });
  } catch (error) {
    logger.error('Failed to send message to Telegram channel', {
      error: error instanceof Error ? error.message : 'Unknown error',
      messageLength: message.length,
    });
    throw error;
  }
}

export async function postToChannel(message: string): Promise<void> {
  try {
    await sendMessageWithRateLimit(message);
  } catch (error) {
    logger.error('Error posting to Telegram channel', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - we don't want webhook processing to fail if Telegram is down
  }
}

export function getBotInstance(): TelegramBot {
  return getBot();
}

// Channel service wrapper for event handlers
import {
  formatPushMessage,
  formatPullRequestMessage,
  formatReviewMessage,
  formatIssueMessage,
  formatIssueCommentMessage,
} from './formatters';
import { Commit } from '../db/repositories/events';

export const channelService = {
  async postPushEvent(data: {
    org: string;
    repo: string;
    branch: string;
    author: string;
    commitCount: number;
    commits: Array<{ sha: string; message: string }>;
  }): Promise<void> {
    // Format commits for display (use shortened SHA for display, but formatter expects full Commit type)
    const commits: Commit[] = data.commits.map((c) => ({
      id: 0,
      sha: c.sha, // This is already shortened (7 chars) from push handler
      org: data.org,
      repo: data.repo,
      branch: data.branch,
      author: data.author,
      message: c.message,
      url: null,
      additions: 0,
      deletions: 0,
      pushed_at: new Date(),
      created_at: new Date(),
    }));
    const message = formatPushMessage(data.org, data.repo, data.branch, data.author, commits);
    await postToChannel(message);
  },

  async postPullRequestEvent(data: {
    org: string;
    repo: string;
    number: number;
    title: string;
    author: string;
    action: string;
    merged: boolean;
    url: string;
  }): Promise<void> {
    const message = formatPullRequestMessage(
      data.action,
      data.org,
      data.repo,
      data.number,
      data.title,
      data.author,
      data.url,
      data.merged
    );
    await postToChannel(message);
  },

  async postReviewEvent(data: {
    org: string;
    repo: string;
    prNumber: number;
    reviewer: string;
    state: string;
    url: string;
  }): Promise<void> {
    const message = formatReviewMessage(
      data.org,
      data.repo,
      data.prNumber,
      data.reviewer,
      data.state,
      data.url
    );
    await postToChannel(message);
  },

  async postIssueEvent(data: {
    org: string;
    repo: string;
    number: number;
    title: string;
    author: string;
    action: string;
    url: string;
  }): Promise<void> {
    const message = formatIssueMessage(
      data.action,
      data.org,
      data.repo,
      data.number,
      data.title,
      data.author,
      data.url
    );
    await postToChannel(message);
  },

  async postIssueCommentEvent(data: {
    org: string;
    repo: string;
    issueNumber: number;
    author: string;
    url: string;
  }): Promise<void> {
    const message = formatIssueCommentMessage(
      data.org,
      data.repo,
      data.issueNumber,
      data.author,
      data.url
    );
    await postToChannel(message);
  },
};
