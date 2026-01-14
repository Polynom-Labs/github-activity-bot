import TelegramBot from 'node-telegram-bot-api';
import {
  setWhitelistStatus,
  getUserMapping,
  createOrUpdateUserMapping,
  getWhitelistedUsers,
} from '../../db/repositories/users';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export async function handleWhitelistCommand(
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
      // Show whitelisted users
      const whitelisted = await getWhitelistedUsers();
      if (whitelisted.length === 0) {
        await bot.sendMessage(msg.chat.id, 'No users are currently whitelisted.');
        return;
      }

      const usersList = whitelisted
        .map((u) => `• @${u.github_username}`)
        .join('\n');
      await bot.sendMessage(msg.chat.id, `*Whitelisted users:*\n\n${usersList}`, {
        parse_mode: 'Markdown',
      });
      return;
    }

    const action = args[0].toLowerCase();
    const githubUsername = args[1];

    if (!githubUsername) {
      await bot.sendMessage(
        msg.chat.id,
        'Usage: /whitelist add|remove <github_username>\nExample: /whitelist add alice'
      );
      return;
    }

    // Ensure user mapping exists
    let userMapping = await getUserMapping(githubUsername);
    if (!userMapping) {
      userMapping = await createOrUpdateUserMapping(githubUsername, null, null);
    }

    if (action === 'add') {
      await setWhitelistStatus(githubUsername, true);
      await bot.sendMessage(
        msg.chat.id,
        `✅ Added @${githubUsername} to the alert whitelist`
      );
      logger.info('User added to whitelist', {
        githubUsername,
        updatedBy: msg.from?.username || msg.from?.id,
      });
    } else if (action === 'remove') {
      await setWhitelistStatus(githubUsername, false);
      await bot.sendMessage(
        msg.chat.id,
        `❌ Removed @${githubUsername} from the alert whitelist`
      );
      logger.info('User removed from whitelist', {
        githubUsername,
        updatedBy: msg.from?.username || msg.from?.id,
      });
    } else {
      await bot.sendMessage(
        msg.chat.id,
        'Usage: /whitelist add|remove <github_username>'
      );
    }
  } catch (error) {
    logger.error('Error in whitelist command', { error: error instanceof Error ? error.message : String(error) });
    await bot.sendMessage(msg.chat.id, 'Error updating whitelist. Please try again.');
  }
}
