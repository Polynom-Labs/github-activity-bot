import { handlePullRequestEvent } from '../../../../src/github/events/pullRequest';
import { PullRequestEventPayload } from '../../../../src/domain/types';
import * as eventsRepo from '../../../../src/db/repositories/events';
import * as channelService from '../../../../src/telegram/channel';
import * as githubApi from '../../../../src/github/api';

jest.mock('../../../../src/db/repositories/events');
jest.mock('../../../../src/telegram/channel');
jest.mock('../../../../src/github/api', () => ({
  getInstallationToken: jest.fn(),
  getPRStats: jest.fn(),
}));

const mockStorePullRequest = eventsRepo.storePullRequest as jest.MockedFunction<typeof eventsRepo.storePullRequest>;
const mockPostPullRequestEvent = channelService.channelService.postPullRequestEvent as jest.MockedFunction<typeof channelService.channelService.postPullRequestEvent>;
const mockGetInstallationToken = githubApi.getInstallationToken as jest.MockedFunction<typeof githubApi.getInstallationToken>;
const mockGetPRStats = githubApi.getPRStats as jest.MockedFunction<typeof githubApi.getPRStats>;

describe('Pull Request Event Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorePullRequest.mockResolvedValue(1);
    mockPostPullRequestEvent.mockResolvedValue();
  });

  it('should process opened PR event', async () => {
    const payload: PullRequestEventPayload = {
      action: 'opened',
      pull_request: {
        id: 12345,
        number: 42,
        title: 'Test PR',
        state: 'open',
        merged: false,
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        html_url: 'https://github.com/test-org/test-repo/pull/42',
        additions: 100,
        deletions: 50,
      },
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      sender: { login: 'testuser' },
    };

    await handlePullRequestEvent(payload, 'test-org', 'test-repo');

    expect(mockStorePullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        number: 42,
        title: 'Test PR',
        author: 'testuser',
        action: 'opened',
        merged: false,
        additions: 100,
        deletions: 50,
      })
    );
    expect(mockPostPullRequestEvent).toHaveBeenCalled();
  });

  it('should process merged PR event', async () => {
    const payload: PullRequestEventPayload = {
      action: 'closed',
      pull_request: {
        id: 12345,
        number: 42,
        title: 'Test PR',
        state: 'closed',
        merged: true,
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        html_url: 'https://github.com/test-org/test-repo/pull/42',
        additions: 100,
        deletions: 50,
      },
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      sender: { login: 'testuser' },
    };

    await handlePullRequestEvent(payload, 'test-org', 'test-repo');

    expect(mockStorePullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        merged: true,
      })
    );
    expect(mockPostPullRequestEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        merged: true,
      })
    );
  });

  it('should fetch PR stats from API if missing in webhook', async () => {
    mockGetInstallationToken.mockResolvedValue('test-token');
    mockGetPRStats.mockResolvedValue({ additions: 200, deletions: 100 });

    const payload: PullRequestEventPayload = {
      action: 'closed',
      pull_request: {
        id: 12345,
        number: 42,
        title: 'Test PR',
        state: 'closed',
        merged: true,
        user: { login: 'testuser' },
        html_url: 'https://github.com/test-org/test-repo/pull/42',
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        // Missing additions/deletions
      },
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      sender: { login: 'testuser' },
    };

    await handlePullRequestEvent(payload, 'test-org', 'test-repo');

    expect(mockGetInstallationToken).toHaveBeenCalledWith('test-org');
    expect(mockGetPRStats).toHaveBeenCalledWith('test-org', 'test-repo', 42, 'test-token');
    expect(mockStorePullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        additions: 200,
        deletions: 100,
      })
    );
  });

  it('should ignore non-relevant PR actions', async () => {
    const payload: PullRequestEventPayload = {
      action: 'labeled',
      pull_request: {
        id: 12345,
        number: 42,
        title: 'Test PR',
        state: 'open',
        merged: false,
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        html_url: 'https://github.com/test-org/test-repo/pull/42',
      },
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      sender: { login: 'testuser' },
    };

    await handlePullRequestEvent(payload, 'test-org', 'test-repo');

    expect(mockStorePullRequest).not.toHaveBeenCalled();
  });
});
