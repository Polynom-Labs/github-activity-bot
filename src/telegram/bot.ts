import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { logger } from '../utils/logger';
import { handleStatsCommand } from './commands/stats';
import { handleThresholdCommand } from './commands/threshold';
import { handleWhitelistCommand } from './commands/whitelist';
import { handleLinkCommand } from './commands/link';
import { handleReportCommand } from './commands/report';

let bot: TelegramBot | null = null;

export function initializeBot(): TelegramBot {
  if (bot) {
    return bot;
  }

  bot = new TelegramBot(config.telegram.botToken, {
    polling: {
      interval: 1000,
      autoStart: false,
    },
  });

  // Set up command handlers
  bot.onText(/\/stats(?:\s+(.+))?/, async (msg, match) => {
    try {
      const args = match?.[1]?.trim().split(/\s+/) || [];
      await handleStatsCommand(bot!, msg, args);
    } catch (error) {
      logger.error('Error handling /stats command', { error: error instanceof Error ? error.message : String(error) });
      await bot!.sendMessage(msg.chat.id, 'Error processing stats command.');
    }
  });

  bot.onText(/\/threshold\s+(.+)/, async (msg, match) => {
    try {
      const args = match?.[1]?.trim().split(/\s+/) || [];
      await handleThresholdCommand(bot!, msg, args);
    } catch (error) {
      logger.error('Error handling /threshold command', error);
      await bot!.sendMessage(msg.chat.id, 'Error processing threshold command.');
    }
  });

  bot.onText(/\/whitelist\s+(.+)/, async (msg, match) => {
    try {
      const args = match?.[1]?.trim().split(/\s+/) || [];
      await handleWhitelistCommand(bot!, msg, args);
    } catch (error) {
      logger.error('Error handling /whitelist command', { error: error instanceof Error ? error.message : String(error) });
      await bot!.sendMessage(msg.chat.id, 'Error processing whitelist command.');
    }
  });

  bot.onText(/\/link\s+(.+)/, async (msg, match) => {
    try {
      const args = match?.[1]?.trim().split(/\s+/) || [];
      await handleLinkCommand(bot!, msg, args);
    } catch (error) {
      logger.error('Error handling /link command', { error: error instanceof Error ? error.message : String(error) });
      await bot!.sendMessage(msg.chat.id, 'Error processing link command.');
    }
  });

  bot.onText(/\/report\s+(.+)/, async (msg, match) => {
    try {
      const args = match?.[1]?.trim().split(/\s+/) || [];
      await handleReportCommand(bot!, msg, args);
    } catch (error) {
      logger.error('Error handling /report command', { error: error instanceof Error ? error.message : String(error) });
      await bot!.sendMessage(msg.chat.id, 'Error processing report command.');
    }
  });

  bot.on('polling_error', (error) => {
    logger.error('Telegram polling error', { error: error instanceof Error ? error.message : String(error) });
  });

  // Only listen to messages from admin group
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId !== config.telegram.adminGroupId) {
      logger.debug('Ignoring message from non-admin chat', { chatId });
      return;
    }
  });

  logger.info('Telegram bot initialized');
  return bot;
}

export function startPolling(): void {
  if (!bot) {
    throw new Error('Bot not initialized. Call initializeBot() first.');
  }
  bot.startPolling();
  logger.info('Telegram bot polling started');
}

export function stopPolling(): void {
  if (bot) {
    bot.stopPolling();
    logger.info('Telegram bot polling stopped');
  }
}

export function getBot(): TelegramBot {
  if (!bot) {
    throw new Error('Bot not initialized. Call initializeBot() first.');
  }
  return bot;
}
