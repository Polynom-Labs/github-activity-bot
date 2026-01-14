import { getUserStats, getTeamStats, getTopContributors, getTopRepos } from '../../../src/domain/stats';
import * as db from '../../../src/db/index';

jest.mock('../../../src/db/index');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('Stats Domain', () => {
  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-01-07');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          github_username: 'testuser',
          commits: 10,
          prs_opened: 3,
          prs_merged: 2,
          prs_closed: 1,
          reviews_approved: 5,
          reviews_changes: 1,
          reviews_commented: 2,
          issues_opened: 2,
          issues_closed: 1,
          comments: 8,
        },
      ]);

      const stats = await getUserStats('testuser', startDate, endDate);

      expect(stats.github_username).toBe('testuser');
      expect(stats.commits).toBe(10);
      expect(stats.prs_merged).toBe(2);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTeamStats', () => {
    it('should return team statistics', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          total_commits: 50,
          total_prs_opened: 10,
          total_prs_merged: 8,
          total_prs_closed: 2,
          total_reviews: 20,
          total_reviews_approved: 12,
          total_reviews_changes: 3,
          total_reviews_commented: 5,
          total_issues_opened: 5,
          total_issues_closed: 3,
          total_comments: 15,
          total_additions: 5000,
          total_deletions: 2000,
        },
      ]);

      const stats = await getTeamStats(startDate, endDate);

      expect(stats.total_commits).toBe(50);
      expect(stats.total_additions).toBe(5000);
      expect(stats.total_deletions).toBe(2000);
    });
  });

  describe('getTopContributors', () => {
    it('should return top contributors', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          github_username: 'alice',
          commits: 20,
          prs_merged: 5,
          reviews: 10,
        },
        {
          github_username: 'bob',
          commits: 15,
          prs_merged: 3,
          reviews: 8,
        },
      ]);

      const contributors = await getTopContributors(startDate, endDate, 5);

      expect(contributors).toHaveLength(2);
      expect(contributors[0].github_username).toBe('alice');
      expect(contributors[0].commits).toBe(20);
    });
  });

  describe('getTopRepos', () => {
    it('should return top repositories', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          org: 'test-org',
          repo: 'repo1',
          commits: 30,
        },
        {
          org: 'test-org',
          repo: 'repo2',
          commits: 20,
        },
      ]);

      const repos = await getTopRepos(startDate, endDate, 5);

      expect(repos).toHaveLength(2);
      expect(repos[0].commits).toBe(30);
    });
  });
});
