import { handlePushEvent } from '../../../../src/github/events/push';
import { PushEventPayload } from '../../../../src/domain/types';
import * as eventsRepo from '../../../../src/db/repositories/events';
import * as channelService from '../../../../src/telegram/channel';

jest.mock('../../../../src/db/repositories/events');
jest.mock('../../../../src/telegram/channel');

const mockStoreCommit = eventsRepo.storeCommit as jest.MockedFunction<typeof eventsRepo.storeCommit>;
const mockPostPushEvent = channelService.channelService.postPushEvent as jest.MockedFunction<typeof channelService.channelService.postPushEvent>;

describe('Push Event Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreCommit.mockResolvedValue(1);
    mockPostPushEvent.mockResolvedValue();
  });

  it('should process push event with single commit', async () => {
    const payload: PushEventPayload = {
      ref: 'refs/heads/main',
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      pusher: { name: 'testuser' },
      commits: [
        {
          id: 'abc123',
          message: 'Test commit',
          author: { name: 'Test User', username: 'testuser' },
          url: 'https://github.com/test-org/test-repo/commit/abc123',
        },
      ],
      sender: { login: 'testuser' },
    };

    await handlePushEvent(payload, 'test-org', 'test-repo');

    expect(mockStoreCommit).toHaveBeenCalledTimes(1);
    expect(mockPostPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPostPushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        org: 'test-org',
        repo: 'test-repo',
        branch: 'main',
        commitCount: 1,
      })
    );
  });

  it('should process push event with multiple commits', async () => {
    const payload: PushEventPayload = {
      ref: 'refs/heads/feature',
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      pusher: { name: 'testuser' },
      commits: [
        {
          id: 'abc123',
          message: 'Commit 1',
          author: { name: 'Test User', username: 'testuser' },
          url: 'https://github.com/test-org/test-repo/commit/abc123',
        },
        {
          id: 'def456',
          message: 'Commit 2',
          author: { name: 'Test User', username: 'testuser' },
          url: 'https://github.com/test-org/test-repo/commit/def456',
        },
      ],
      sender: { login: 'testuser' },
    };

    await handlePushEvent(payload, 'test-org', 'test-repo');

    expect(mockStoreCommit).toHaveBeenCalledTimes(2);
    expect(mockPostPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPostPushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        commitCount: 2,
        branch: 'feature',
      })
    );
  });

  it('should skip push event with no commits', async () => {
    const payload: PushEventPayload = {
      ref: 'refs/heads/main',
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      pusher: { name: 'testuser' },
      commits: [],
      sender: { login: 'testuser' },
    };

    await handlePushEvent(payload, 'test-org', 'test-repo');

    expect(mockStoreCommit).not.toHaveBeenCalled();
    expect(mockPostPushEvent).not.toHaveBeenCalled();
  });
});
