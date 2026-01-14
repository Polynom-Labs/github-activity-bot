import {
  formatPushMessage,
  formatPullRequestMessage,
  formatReviewMessage,
  formatIssueMessage,
  formatIssueCommentMessage,
} from '../../../src/telegram/formatters';
import { Commit } from '../../../src/db/repositories/events';

describe('Telegram Formatters', () => {
  describe('formatPushMessage', () => {
    it('should format single commit', () => {
      const commits: Commit[] = [
        {
          id: 1,
          sha: 'abc1234',
          org: 'test-org',
          repo: 'test-repo',
          branch: 'main',
          author: 'testuser',
          message: 'Test commit',
          url: null,
          additions: 0,
          deletions: 0,
          pushed_at: new Date(),
          created_at: new Date(),
        },
      ];

      const message = formatPushMessage('test-org', 'test-repo', 'main', 'testuser', commits);

      // Message escapes special characters, so check for escaped version
      expect(message).toContain('test\\-org/test\\-repo');
      expect(message).toContain('main');
      expect(message).toContain('testuser');
      expect(message).toContain('abc1234');
      expect(message).toContain('Test commit');
    });

    it('should format multiple commits', () => {
      const commits: Commit[] = [
        {
          id: 1,
          sha: 'abc1234',
          org: 'test-org',
          repo: 'test-repo',
          branch: 'main',
          author: 'testuser',
          message: 'Commit 1',
          url: null,
          additions: 0,
          deletions: 0,
          pushed_at: new Date(),
          created_at: new Date(),
        },
        {
          id: 2,
          sha: 'def5678',
          org: 'test-org',
          repo: 'test-repo',
          branch: 'main',
          author: 'testuser',
          message: 'Commit 2',
          url: null,
          additions: 0,
          deletions: 0,
          pushed_at: new Date(),
          created_at: new Date(),
        },
      ];

      const message = formatPushMessage('test-org', 'test-repo', 'main', 'testuser', commits);

      expect(message).toContain('2 commits');
      expect(message).toContain('abc1234');
      expect(message).toContain('def5678');
    });

    it('should escape markdown special characters', () => {
      const commits: Commit[] = [
        {
          id: 1,
          sha: 'abc1234',
          org: 'test-org',
          repo: 'test_repo',
          branch: 'main',
          author: 'test_user',
          message: 'Fix bug (critical)',
          url: null,
          additions: 0,
          deletions: 0,
          pushed_at: new Date(),
          created_at: new Date(),
        },
      ];

      const message = formatPushMessage('test-org', 'test_repo', 'main', 'test_user', commits);

      // Should escape underscores
      expect(message).not.toContain('test_repo');
      expect(message).toContain('test\\_repo');
    });
  });

  describe('formatPullRequestMessage', () => {
    it('should format opened PR', () => {
      const message = formatPullRequestMessage(
        'opened',
        'test-org',
        'test-repo',
        42,
        'Test PR',
        'testuser',
        'https://github.com/test-org/test-repo/pull/42',
        false
      );

      expect(message).toContain('PR #42');
      expect(message).toContain('opened');
      expect(message).toContain('testuser');
      expect(message).toContain('Test PR');
    });

    it('should format merged PR', () => {
      const message = formatPullRequestMessage(
        'closed',
        'test-org',
        'test-repo',
        42,
        'Test PR',
        'testuser',
        'https://github.com/test-org/test-repo/pull/42',
        true
      );

      expect(message).toContain('merged');
      expect(message).toContain('✅');
    });
  });

  describe('formatReviewMessage', () => {
    it('should format approved review', () => {
      const message = formatReviewMessage(
        'test-org',
        'test-repo',
        42,
        'reviewer',
        'approved',
        'https://github.com/test-org/test-repo/pull/42#review'
      );

      expect(message).toContain('approved');
      expect(message).toContain('✅');
      expect(message).toContain('reviewer');
    });

    it('should format changes requested review', () => {
      const message = formatReviewMessage(
        'test-org',
        'test-repo',
        42,
        'reviewer',
        'changes_requested',
        'https://github.com/test-org/test-repo/pull/42#review'
      );

      expect(message).toContain('requested changes');
      expect(message).toContain('🔄');
    });
  });

  describe('formatIssueMessage', () => {
    it('should format opened issue', () => {
      const message = formatIssueMessage(
        'opened',
        'test-org',
        'test-repo',
        5,
        'Test Issue',
        'testuser',
        'https://github.com/test-org/test-repo/issues/5'
      );

      expect(message).toContain('Issue #5');
      expect(message).toContain('opened');
      expect(message).toContain('📌');
    });
  });

  describe('formatIssueCommentMessage', () => {
    it('should format issue comment', () => {
      const message = formatIssueCommentMessage(
        'test-org',
        'test-repo',
        5,
        'commenter',
        'https://github.com/test-org/test-repo/issues/5#comment'
      );

      expect(message).toContain('Comment on issue #5');
      expect(message).toContain('commenter');
      expect(message).toContain('💬');
    });
  });
});
