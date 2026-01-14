import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getPool, query } from './index';
import { logger } from '../utils/logger';

export async function runMigrations(): Promise<void> {
  try {
    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get applied migrations
    const applied = await query<{ name: string }>('SELECT name FROM migrations ORDER BY id');
    const appliedNames = new Set(applied.map((m) => m.name));

    // Find migration files
    const migrationPath = resolve(process.cwd(), 'migrations', '001_initial.sql');
    const migrationName = '001_initial.sql';

    if (appliedNames.has(migrationName)) {
      logger.info('Migration already applied', { migration: migrationName });
      return;
    }

    logger.info('Running migration', { migration: migrationName });
    const sql = readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await query(sql);

    // Record migration
    await query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);

    logger.info('Migration completed', { migration: migrationName });
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

async function runMigrationsStandalone(): Promise<void> {
  const pool = getPool();
  try {
    await runMigrations();
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrationsStandalone()
    .then(() => {
      logger.info('Migrations completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    });
}
