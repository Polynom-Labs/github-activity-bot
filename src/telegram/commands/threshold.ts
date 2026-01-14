import TelegramBot from 'node-telegram-bot-api';
import { setPRReviewAlertHours, getPRReviewAlertHours } from '../../db/repositories/settings';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export async function handleThresholdCommand(
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
      // Show current threshold
      const currentHours = await getPRReviewAlertHours();
      await bot.sendMessage(
        msg.chat.id,
        `Current PR review alert threshold: ${currentHours} hours`
      );
      return;
    }

    if (args[0] === 'pr_review_hours' && args[1]) {
      const hours = parseInt(args[1], 10);
      if (isNaN(hours) || hours < 1) {
        await bot.sendMessage(
          msg.chat.id,
          'Invalid hours value. Please provide a positive number.'
        );
        return;
      }

      await setPRReviewAlertHours(hours);
      await bot.sendMessage(
        msg.chat.id,
        `PR review alert threshold set to ${hours} hours`
      );
      logger.info('PR review alert threshold updated', {
        hours,
        updatedBy: msg.from?.username || msg.from?.id,
      });
    } else {
      await bot.sendMessage(
        msg.chat.id,
        'Usage: /threshold pr_review_hours <hours>\nExample: /threshold pr_review_hours 48'
      );
    }
  } catch (error) {
    logger.error('Error in threshold command', { error: error instanceof Error ? error.message : String(error) });
    await bot.sendMessage(msg.chat.id, 'Error updating threshold. Please try again.');
  }
}
