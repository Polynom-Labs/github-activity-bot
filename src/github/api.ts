import { config } from '../config';
import { logger } from '../utils/logger';

let octokit: any = null;

async function getOctokit(): Promise<any> {
  if (!octokit) {
    const { createAppAuth } = await import('@octokit/auth-app');
    const { Octokit } = await import('@octokit/rest');
    
    octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.github.appId,
        privateKey: config.github.privateKey,
      },
    });
  }
  return octokit;
}

export async function getInstallationToken(org: string): Promise<string> {
  try {
    const octokit = await getOctokit();
    const { data: installations } = await octokit.apps.listInstallations();
    
    const installation = installations.find(
      (inst: any) => inst.account?.login === org
    );

    if (!installation) {
      throw new Error(`No installation found for org: ${org}`);
    }

    const { createAppAuth } = await import('@octokit/auth-app');
    const auth = createAppAuth({
      appId: config.github.appId,
      privateKey: config.github.privateKey,
      installationId: installation.id,
    });

    const { token } = await auth({ type: 'installation' });
    return token;
  } catch (error) {
    logger.error('Failed to get installation token', {
      org,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getPRStats(
  org: string,
  repo: string,
  prNumber: number,
  token: string
): Promise<{ additions: number; deletions: number }> {
  try {
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.pulls.get({
      owner: org,
      repo,
      pull_number: prNumber,
    });

    return {
      additions: data.additions || 0,
      deletions: data.deletions || 0,
    };
  } catch (error) {
    logger.error('Failed to get PR stats', {
      org,
      repo,
      prNumber,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { additions: 0, deletions: 0 };
  }
}
