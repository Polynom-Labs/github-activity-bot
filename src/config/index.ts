import { readFileSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../utils/logger';

interface GitHubConfig {
  webhookSecret: string;
  appId: number;
  privateKey: string;
}

interface TelegramConfig {
  botToken: string;
  channelId: string;
  adminGroupId: string;
}

interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  github: GitHubConfig;
  telegram: TelegramConfig;
  defaults: {
    prReviewAlertHours: number;
    dailyReportCron: string;
    weeklyReportCron: string;
  };
}

function loadPrivateKey(path: string): string {
  try {
    const fullPath = resolve(process.cwd(), path);
    return readFileSync(fullPath, 'utf-8');
  } catch (error) {
    logger.error('Failed to load GitHub private key', {
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`Failed to load private key from ${path}`);
  }
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
}

export const config: Config = {
  port: getEnvNumber('PORT', 3000),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  databaseUrl: getEnvVar('DATABASE_URL'),
  github: {
    webhookSecret: getEnvVar('GITHUB_WEBHOOK_SECRET'),
    appId: getEnvNumber('GITHUB_APP_ID'),
    privateKey: loadPrivateKey(getEnvVar('GITHUB_PRIVATE_KEY_PATH')),
  },
  telegram: {
    botToken: getEnvVar('TELEGRAM_BOT_TOKEN'),
    channelId: getEnvVar('TELEGRAM_CHANNEL_ID'),
    adminGroupId: getEnvVar('TELEGRAM_ADMIN_GROUP_ID'),
  },
  defaults: {
    prReviewAlertHours: getEnvNumber('DEFAULT_PR_REVIEW_ALERT_HOURS', 24),
    dailyReportCron: getEnvVar('DAILY_REPORT_CRON', '0 9 * * *'),
    weeklyReportCron: getEnvVar('WEEKLY_REPORT_CRON', '0 9 * * 1'),
  },
};

// Validate config on load
if (!config.databaseUrl.startsWith('postgres://')) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string');
}

logger.info('Configuration loaded', {
  port: config.port,
  nodeEnv: config.nodeEnv,
  githubAppId: config.github.appId,
});

export { Config };
