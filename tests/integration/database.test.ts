import { getPool, query, queryOne, transaction } from '../../src/db/index';
import {
  storeGitHubEvent,
  checkDeliveryIdExists,
  storeCommit,
  storePullRequest,
} from '../../src/db/repositories/events';

// These tests require a real database connection
// Set TEST_DATABASE_URL environment variable to run
const SKIP_DB_TESTS = !process.env.TEST_DATABASE_URL;

describe.skip('Database Integration', () => {
  const testDeliveryId = `test-delivery-${Date.now()}`;

  beforeAll(async () => {
    if (SKIP_DB_TESTS) {
      console.log('Skipping database integration tests - TEST_DATABASE_URL not set');
      return;
    }
    // Ensure database connection
    const pool = getPool();
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    // Cleanup test data
    await query('DELETE FROM github_events WHERE delivery_id LIKE $1', [`test-delivery-%`]);
    await query('DELETE FROM commits WHERE sha LIKE $1', ['test-commit-%']);
    await query('DELETE FROM pull_requests WHERE org = $1', ['test-org']);
  });

  describe('Event Storage', () => {
    it('should store and retrieve GitHub event', async () => {
      const eventId = await storeGitHubEvent(
        testDeliveryId,
        'push',
        'test-org',
        'test-repo',
        'testuser',
        { test: 'data' }
      );

      expect(eventId).toBeGreaterThan(0);

      const exists = await checkDeliveryIdExists(testDeliveryId);
      expect(exists).toBe(true);
    });

    it('should prevent duplicate delivery IDs', async () => {
      await expect(
        storeGitHubEvent(
          testDeliveryId, // Same delivery ID
          'push',
          'test-org',
          'test-repo',
          'testuser',
          { test: 'data' }
        )
      ).rejects.toThrow();
    });
  });

  describe('Commit Storage', () => {
    it('should store commit', async () => {
      const commitId = await storeCommit({
        sha: `test-commit-${Date.now()}`,
        org: 'test-org',
        repo: 'test-repo',
        branch: 'main',
        author: 'testuser',
        message: 'Test commit',
        url: 'https://github.com/test-org/test-repo/commit/test',
        additions: 10,
        deletions: 5,
        pushed_at: new Date(),
      });

      expect(commitId).toBeGreaterThan(0);
    });

    it('should prevent duplicate commits by SHA', async () => {
      const sha = `test-commit-duplicate-${Date.now()}`;

      await storeCommit({
        sha,
        org: 'test-org',
        repo: 'test-repo',
        branch: 'main',
        author: 'testuser',
        message: 'Test commit',
        url: null,
        additions: 0,
        deletions: 0,
        pushed_at: new Date(),
      });

      // Second insert should return 0 (no new row)
      const commitId = await storeCommit({
        sha, // Same SHA
        org: 'test-org',
        repo: 'test-repo',
        branch: 'main',
        author: 'testuser',
        message: 'Test commit',
        url: null,
        additions: 0,
        deletions: 0,
        pushed_at: new Date(),
      });

      expect(commitId).toBe(0);
    });
  });

  describe('Pull Request Storage', () => {
    it('should store pull request', async () => {
      const prId = await storePullRequest({
        gh_id: 12345,
        org: 'test-org',
        repo: 'test-repo',
        number: 42,
        title: 'Test PR',
        author: 'testuser',
        state: 'open',
        action: 'opened',
        merged: false,
        additions: 100,
        deletions: 50,
        url: 'https://github.com/test-org/test-repo/pull/42',
        event_at: new Date(),
      });

      expect(prId).toBeGreaterThan(0);
    });
  });

  describe('Transactions', () => {
    it('should rollback on error', async () => {
      await expect(
        transaction(async (client) => {
          await client.query('INSERT INTO commits (sha, org, repo, branch, author, message, url, additions, deletions, pushed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [
            'test-rollback',
            'test-org',
            'test-repo',
            'main',
            'testuser',
            'Test',
            null,
            0,
            0,
            new Date(),
          ]);
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      // Verify rollback - commit should not exist
      const result = await queryOne('SELECT * FROM commits WHERE sha = $1', ['test-rollback']);
      expect(result).toBeNull();
    });
  });
});
