import { handleReviewEvent } from '../../../../src/github/events/review';
import { ReviewEventPayload } from '../../../../src/domain/types';
import * as eventsRepo from '../../../../src/db/repositories/events';
import * as channelService from '../../../../src/telegram/channel';

jest.mock('../../../../src/db/repositories/events');
jest.mock('../../../../src/telegram/channel');

const mockStoreReview = eventsRepo.storeReview as jest.MockedFunction<typeof eventsRepo.storeReview>;
const mockPostReviewEvent = channelService.channelService.postReviewEvent as jest.MockedFunction<typeof channelService.channelService.postReviewEvent>;

describe('Review Event Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreReview.mockResolvedValue(1);
    mockPostReviewEvent.mockResolvedValue();
  });

  it('should process approved review', async () => {
    const payload: ReviewEventPayload = {
      action: 'submitted',
      review: {
        id: 67890,
        state: 'approved',
        user: { login: 'reviewer' },
        html_url: 'https://github.com/test-org/test-repo/pull/42#review',
        submitted_at: '2026-01-14T11:00:00Z',
      },
      pull_request: { number: 42 },
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      sender: { login: 'reviewer' },
    };

    await handleReviewEvent(payload, 'test-org', 'test-repo');

    expect(mockStoreReview).toHaveBeenCalledWith(
      expect.objectContaining({
        pr_number: 42,
        reviewer: 'reviewer',
        state: 'approved',
      })
    );
    expect(mockPostReviewEvent).toHaveBeenCalled();
  });

  it('should process changes requested review', async () => {
    const payload: ReviewEventPayload = {
      action: 'submitted',
      review: {
        id: 67891,
        state: 'changes_requested',
        user: { login: 'reviewer' },
        html_url: 'https://github.com/test-org/test-repo/pull/42#review',
        submitted_at: '2026-01-14T11:00:00Z',
      },
      pull_request: { number: 42 },
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      sender: { login: 'reviewer' },
    };

    await handleReviewEvent(payload, 'test-org', 'test-repo');

    expect(mockStoreReview).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'changes_requested',
      })
    );
  });

  it('should ignore non-submitted actions', async () => {
    const payload: ReviewEventPayload = {
      action: 'dismissed',
      review: {
        id: 67892,
        state: 'approved',
        user: { login: 'reviewer' },
        html_url: 'https://github.com/test-org/test-repo/pull/42#review',
        submitted_at: '2026-01-14T11:00:00Z',
      },
      pull_request: { number: 42 },
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      sender: { login: 'reviewer' },
    };

    await handleReviewEvent(payload, 'test-org', 'test-repo');

    expect(mockStoreReview).not.toHaveBeenCalled();
  });
});
