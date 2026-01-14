import * as cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { generateDailyReport } from './dailyReport';
import { generateWeeklyReport } from './weeklyReport';
import { checkAndSendAlerts } from './alertChecker';
import { cleanupOldData } from './cleanup';

let dailyJob: cron.ScheduledTask | null = null;
let weeklyJob: cron.ScheduledTask | null = null;
let alertJob: cron.ScheduledTask | null = null;
let cleanupJob: cron.ScheduledTask | null = null;

export function initializeScheduler(): void {
  // Daily report job
  dailyJob = cron.schedule(config.defaults.dailyReportCron, async () => {
    try {
      logger.info('Running daily report job');
      await generateDailyReport();
    } catch (error) {
      logger.error('Error in daily report job', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Weekly report job
  weeklyJob = cron.schedule(config.defaults.weeklyReportCron, async () => {
    try {
      logger.info('Running weekly report job');
      await generateWeeklyReport();
    } catch (error) {
      logger.error('Error in weekly report job', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Alert checker job (every 15 minutes)
  alertJob = cron.schedule('*/15 * * * *', async () => {
    try {
      logger.debug('Running alert checker job');
      await checkAndSendAlerts();
    } catch (error) {
      logger.error('Error in alert checker job', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Cleanup job (daily at 2 AM UTC)
  cleanupJob = cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Running cleanup job');
      await cleanupOldData();
    } catch (error) {
      logger.error('Error in cleanup job', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  logger.info('Scheduler initialized', {
    dailyCron: config.defaults.dailyReportCron,
    weeklyCron: config.defaults.weeklyReportCron,
    alertCron: '*/15 * * * *',
    cleanupCron: '0 2 * * *',
  });
}

export function stopScheduler(): void {
  if (dailyJob) {
    dailyJob.stop();
    dailyJob = null;
  }
  if (weeklyJob) {
    weeklyJob.stop();
    weeklyJob = null;
  }
  if (alertJob) {
    alertJob.stop();
    alertJob = null;
  }
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
  }
  logger.info('Scheduler stopped');
}
