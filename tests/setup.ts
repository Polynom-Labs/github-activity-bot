// Set test environment variables before importing config
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/github_activity_test';
process.env.GITHUB_WEBHOOK_SECRET = process.env.TEST_WEBHOOK_SECRET || 'test_secret_123';
process.env.GITHUB_APP_ID = '12345';
process.env.GITHUB_PRIVATE_KEY_PATH = './tests/fixtures/test-key.pem';
process.env.TELEGRAM_BOT_TOKEN = '123456:TEST-BOT-TOKEN';
process.env.TELEGRAM_CHANNEL_ID = '@test_channel';
process.env.TELEGRAM_ADMIN_GROUP_ID = '-100123456789';
process.env.PORT = '3001'; // Different port for tests

// Config will be loaded when modules import it (env vars are set above)
// Importing here just ensures env vars are set before any module loads config
void import('../src/config');

// Mock GitHub API to avoid ES module issues
jest.mock('../src/github/api', () => ({
  getInstallationToken: jest.fn(),
  getPRStats: jest.fn(),
}));

// Mock logger to reduce noise in tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Telegram bot to avoid real API calls in unit/integration tests
jest.mock('../src/telegram/bot', () => ({
  initializeBot: jest.fn(),
  startPolling: jest.fn(),
  stopPolling: jest.fn(),
  getBot: jest.fn(() => ({
    sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
    onText: jest.fn(),
    on: jest.fn(),
  })),
}));

// Global test timeout
jest.setTimeout(10000);
