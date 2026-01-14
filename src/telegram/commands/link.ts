import TelegramBot from 'node-telegram-bot-api';
import { createOrUpdateUserMapping } from '../../db/repositories/users';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export async function handleLinkCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  args: string[]
): Promise<void> {
  // Check if message is from admin group
  if (msg.chat.id.toString() !== config.telegram.adminGroupId) {
    return;
  }

  try {
    if (args.length < 1) {
      await bot.sendMessage(
        msg.chat.id,
        'Usage: /link <github_username> [telegram_user_id]\n' +
          'Example: /link alice 123456789\n' +
          'Or reply to a user\'s message: /link alice'
      );
      return;
    }

    const githubUsername = args[0];
    let telegramUserId: number | undefined;

    if (args.length >= 2) {
      // User provided telegram_user_id as argument
      telegramUserId = parseInt(args[1], 10);
      if (isNaN(telegramUserId)) {
        await bot.sendMessage(
          msg.chat.id,
          'Invalid Telegram user ID. Please provide a number.'
        );
        return;
      }
    } else if (msg.reply_to_message?.from) {
      // Use replied user's ID
      telegramUserId = msg.reply_to_message.from.id;
    } else {
      // Use command sender's ID
      telegramUserId = msg.from?.id;
    }

    if (!telegramUserId) {
      await bot.sendMessage(
        msg.chat.id,
        'Could not determine Telegram user ID. Please provide it as an argument or reply to a message.'
      );
      return;
    }

    const telegramUsername = msg.reply_to_message?.from?.username || msg.from?.username;

    await createOrUpdateUserMapping(githubUsername, telegramUserId, telegramUsername || null);

    await bot.sendMessage(
      msg.chat.id,
      `✅ Linked GitHub user @${githubUsername} to Telegram user ${telegramUserId}${telegramUsername ? ` (@${telegramUsername})` : ''}`
    );

    logger.info('User mapping created/updated', {
      githubUsername,
      telegramUserId,
      telegramUsername,
      updatedBy: msg.from?.username || msg.from?.id,
    });
  } catch (error) {
    logger.error('Error in link command', { error: error instanceof Error ? error.message : String(error) });
    await bot.sendMessage(msg.chat.id, 'Error linking users. Please try again.');
  }
}
