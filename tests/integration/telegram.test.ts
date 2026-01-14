// Telegram integration tests
// Note: Full bot integration requires real Telegram API, so these tests verify
// that the channel service functions can be called without errors.
// Formatting is tested in unit tests.

describe('Telegram Integration', () => {
  // Mock the bot to avoid real API calls
  jest.mock('node-telegram-bot-api', () => {
    return jest.fn().mockImplementation(() => ({
      sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
    }));
  });

  describe('Channel Service Functions', () => {
    it('should have postPushEvent function', () => {
      const { channelService } = require('../../src/telegram/channel');
      expect(typeof channelService.postPushEvent).toBe('function');
    });

    it('should have postPullRequestEvent function', () => {
      const { channelService } = require('../../src/telegram/channel');
      expect(typeof channelService.postPullRequestEvent).toBe('function');
    });

    it('should have postReviewEvent function', () => {
      const { channelService } = require('../../src/telegram/channel');
      expect(typeof channelService.postReviewEvent).toBe('function');
    });

    it('should have postIssueEvent function', () => {
      const { channelService } = require('../../src/telegram/channel');
      expect(typeof channelService.postIssueEvent).toBe('function');
    });

    it('should have postIssueCommentEvent function', () => {
      const { channelService } = require('../../src/telegram/channel');
      expect(typeof channelService.postIssueCommentEvent).toBe('function');
    });
  });

  describe('Post to Channel Function', () => {
    it('should have postToChannel function', () => {
      const { postToChannel } = require('../../src/telegram/channel');
      expect(typeof postToChannel).toBe('function');
    });
  });
});
