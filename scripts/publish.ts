import { execFileSync } from 'node:child_process';
import { logger } from './logger.js';

export function runNpmPublish(cwd: string): void {
  logger.info('Executing registry publication...');

  // --no-git-checks tells npm not to worry about our temporary worktree environment status
  execFileSync(
    'pnpm',
    ['publish', '--access', 'public', '--no-git-checks'],
    {
      cwd,
      stdio: 'inherit',
    }
  );
}

export function createGitHubRelease(
  version: string,
  tagName: string,
  changelogText: string
): void {
  logger.info(`Creating GitHub Release draft for v${version}...`);

  try {
    execFileSync(
      'gh',
      ['release', 'create', `v${version}`, '--title', `${tagName}`, '--notes', changelogText || `Release version ${version}`,],
      {
        stdio: 'inherit',
      }
    );

    logger.success('GitHub release created completely.');
  } catch {
    logger.warn(
      'Could not post automated GitHub Release notes. Verify that the "gh" CLI is installed and authenticated.'
    );
  }
}
