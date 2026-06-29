// scripts/release.ts
import { execFileSync } from 'node:child_process';
import { CONFIG } from './config.js';
import { git, isGitClean } from './git.js';
import { logger } from './logger.js';
import { setupReleaseWorktree, cleanupReleaseWorktree } from './worktree.js';
import { syncDirectories } from './copy.js';
import { getPackageManifest, writeReleaseManifest } from './version.js';
import { runNpmPublish, createGitHubRelease } from './publish.js';

export function runReleaseCommand(): void {
  const steps = [
    'Verifying clean git status',
    'Processing Changesets (version bump & changelog)',
    'Running production build',
    'Syncing files to npm branch worktree',
    'Creating local Git tag',
    'Publishing package to npm',
    'Pushing changes and tags to GitHub',
    'Creating GitHub Release'
  ];

  logger.info('Starting production release workflow...');
  let worktreePath: string | null = null;

  try {
    logger.step(1, steps.length, steps[0]);
    if (!isGitClean()) {
      throw new Error('Working directory contains uncommitted changes. Please stash or commit first.');
    }

    logger.step(2, steps.length, steps[1]);
    logger.info('Consuming markdown logs and generating version increments...');
    execFileSync('pnpm', ['changeset', 'version'], {
      cwd: CONFIG.repoRoot,
      stdio: 'inherit'
    });

    const updatedManifest = getPackageManifest(CONFIG.cliPackagePath);
    const newVersion = updatedManifest.version;
    logger.info(`Target release version calculated: v${newVersion}`);

    logger.step(3, steps.length, steps[2]);
    execFileSync('pnpm', ['--filter', 'shady', 'build'], {
      cwd: CONFIG.repoRoot,
      stdio: 'inherit'
    });

    logger.step(4, steps.length, steps[3]);
    worktreePath = setupReleaseWorktree();

    syncDirectories(CONFIG.distPath, worktreePath);

    writeReleaseManifest(worktreePath, CONFIG.cliPackagePath);

    git(['add', '.'], worktreePath);
    git(['commit', '-m', `release: v${newVersion}`], worktreePath);

    logger.step(5, steps.length, steps[4]);
    git(['tag', '-a', `${newVersion}-${CONFIG.packageManager}`, '-m', `Release v${newVersion}`], worktreePath);

    logger.step(6, steps.length, steps[5]);
    runNpmPublish(worktreePath);

    logger.step(7, steps.length, steps[6]);
    git(['push', 'origin', CONFIG.npmBranch], worktreePath);
    git(['push', 'origin', `v${newVersion}`], worktreePath);

    git(['add', '.'], CONFIG.repoRoot);
    git(['commit', '-m', `chore: version bump v${newVersion} [skip ci]`], CONFIG.repoRoot);
    git(['push'], CONFIG.repoRoot);

    logger.step(8, steps.length, steps[7]);

    createGitHubRelease(newVersion, `Successfully published v${newVersion}`);

    logger.success(`Release published successfully! v${newVersion} is live.`);
  } catch (error) {
    logger.error('Release workflow failed. Aborting operations...', error);
    process.exit(1);
  } finally {
    if (worktreePath) {
      cleanupReleaseWorktree();
    }
  }
}
