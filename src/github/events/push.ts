import { PushEventPayload } from '../../domain/types';
import { eventsRepository, Commit } from '../../db/repositories/events';
import { channelService } from '../../telegram/channel';
import { logger } from '../../utils/logger';

export async function handlePushEvent(
  payload: PushEventPayload,
  org: string,
  repo: string
): Promise<void> {
  try {
    const ref = payload.ref || '';
    const branch = ref.replace('refs/heads/', '');
    const commits = payload.commits || [];
    const sender = payload.sender?.login || payload.pusher?.name || 'unknown';

    if (commits.length === 0) {
      logger.debug('Push event with no commits', { org, repo, branch });
      return;
    }

    const commitData: Omit<Commit, 'id' | 'created_at'>[] = [];
    const pushedAt = new Date();

    for (const commit of commits) {
      const author = commit.author?.username || commit.author?.name || 'unknown';
      const message = commit.message.split('\n')[0]; // First line only
      const url = commit.url;

      const commitRecord: Omit<Commit, 'id' | 'created_at'> = {
        sha: commit.id,
        org,
        repo,
        branch,
        author,
        message,
        url: url || null,
        additions: 0,
        deletions: 0,
        pushed_at: pushedAt,
      };

      commitData.push(commitRecord);

      await eventsRepository.storeCommit(commitRecord);
    }

    // Post to Telegram channel (batched)
    const commitsForMessage = commitData.map((c) => ({
      sha: c.sha.substring(0, 7),
      message: c.message,
    }));
    
    await channelService.postPushEvent({
      org,
      repo,
      branch,
      author: sender,
      commitCount: commits.length,
      commits: commitsForMessage,
    });

    logger.info('Processed push event', {
      org,
      repo,
      branch,
      commitCount: commits.length,
    });
  } catch (error) {
    logger.error('Error handling push event', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
