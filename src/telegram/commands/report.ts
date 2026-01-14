import TelegramBot from 'node-telegram-bot-api';
import { generateDailyReport } from '../../jobs/dailyReport';
import { generateWeeklyReport } from '../../jobs/weeklyReport';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export async function handleReportCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  args: string[]
): Promise<void> {
  // Check if message is from admin group
  if (msg.chat.id.toString() !== config.telegram.adminGroupId) {
    return;
  }

  try {
    if (args.length === 0) {
      await bot.sendMessage(
        msg.chat.id,
        'Usage: /report daily|weekly\nExample: /report daily'
      );
      return;
    }

    const reportType = args[0].toLowerCase();

    if (reportType === 'daily') {
      await bot.sendMessage(msg.chat.id, 'Generating daily report...');
      await generateDailyReport();
      await bot.sendMessage(msg.chat.id, '✅ Daily report generated and sent to channel');
    } else if (reportType === 'weekly') {
      await bot.sendMessage(msg.chat.id, 'Generating weekly report...');
      await generateWeeklyReport();
      await bot.sendMessage(msg.chat.id, '✅ Weekly report generated and sent to channel');
    } else {
      await bot.sendMessage(msg.chat.id, 'Usage: /report daily|weekly');
    }
  } catch (error) {
    logger.error('Error in report command', { error: error instanceof Error ? error.message : String(error) });
    await bot.sendMessage(msg.chat.id, 'Error generating report. Please try again.');
  }
}
