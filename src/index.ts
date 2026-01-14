import 'dotenv/config';
import express from 'express';
import { config } from './config';
import { logger } from './utils/logger';
import { getPool, closePool } from './db';
import { runMigrations } from './db/migrate';
import { webhookRouter } from './github/webhook';
import { initializeBot, startPolling, stopPolling } from './telegram/bot';
import { initializeScheduler, stopScheduler } from './jobs/scheduler';

const app = express();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook endpoint
app.use('/webhook', webhookRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(500).json({ error: 'Internal server error' });
});

async function start(): Promise<void> {
  try {
    logger.info('Starting GitHub Activity Bot...');

    // Initialize database connection
    getPool();
    logger.info('Database connection pool initialized');

    // Run migrations
    await runMigrations();
    logger.info('Database migrations completed');

    // Initialize Telegram bot
    initializeBot();
    startPolling();
    logger.info('Telegram bot started');

    // Initialize scheduler
    initializeScheduler();
    logger.info('Scheduler initialized');

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info('Server started', {
        port: config.port,
        nodeEnv: config.nodeEnv,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
      });

      stopPolling();
      stopScheduler();
      
      await closePool();
      logger.info('Database pool closed');

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start application', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

start();
