// scripts/release.ts
import { execFileSync } from 'node:child_process';
import { CONFIG } from './config.js';
import { git, isGitClean } from './git.js';
import { logger } from './logger.js';
import { setupReleaseWorktree, cleanupReleaseWorktree } from './worktree.js';
import { syncDirectories } from './copy.js';
import { getPackageManifest, writeReleaseManifest } from './version.js';
import { runNpmPublish, createGitHubRelease } from './publish.js';

export function runReleaseCommand(startStep?: number): void {
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
  const targetStep = startStep || 1;

  try {
    if (targetStep <= 1) {
      logger.step(1, steps.length, steps[0]);
      if (!isGitClean()) {
        throw new Error('Working directory contains uncommitted changes. Please stash or commit first.');
      }
    }

    if (targetStep <= 2) {
      logger.step(2, steps.length, steps[1]);
      logger.info('Consuming markdown logs and generating version increments...');
      execFileSync('pnpm', ['changeset', 'version'], {
        cwd: CONFIG.repoRoot,
        stdio: 'inherit'
      });

      const updatedManifest = getPackageManifest(CONFIG.cliPackagePath);
      const newVersion = updatedManifest.version;
      logger.info(`Target release version calculated: v${newVersion}`);
    }

    if (targetStep <= 3) {
      logger.step(3, steps.length, steps[2]);
      execFileSync('pnpm', ['--filter', `${CONFIG.cliPackageName}`, 'build'], {
        cwd: CONFIG.repoRoot,
        stdio: 'inherit'
      });
    }

    if (targetStep <= 4) {
      logger.step(4, steps.length, steps[3]);
      worktreePath = setupReleaseWorktree();

      syncDirectories(CONFIG.distPath, worktreePath);

      writeReleaseManifest(worktreePath, CONFIG.cliPackagePath);

      git(['add', '.'], worktreePath);

      const status = git(['status', '--porcelain'], worktreePath);
      if (status.length > 0) {
        git(['commit', '-m', `release: v${newVersion}`], worktreePath);
        logger.success('Release changes committed to isolation branch.');
      } else {
        git(['commit', '--allow-empty', '-m', `release: v${newVersion} (no-op build change)`], worktreePath);
        logger.warn('No build file changes detected. Created an empty tracking commit for tag matching.');
      }
    }

    if (targetStep <= 5) {
      logger.step(5, steps.length, steps[4]);
      git(['tag', '-a', `${newVersion}-${CONFIG.packageManager}`, '-m', `Release v${newVersion}`], worktreePath);
    }

    if (targetStep <= 6) {
      logger.step(6, steps.length, steps[5]);
      runNpmPublish(worktreePath);
    }

    if (targetStep <= 7) {
      logger.step(7, steps.length, steps[6]);
      git(['push', 'origin', CONFIG.npmBranch], worktreePath);
      git(['push', 'origin', `v${newVersion}`], worktreePath);

      git(['add', '.'], CONFIG.repoRoot);
      git(['commit', '-m', `chore: version bump v${newVersion} [skip ci]`], CONFIG.repoRoot);
      git(['push'], CONFIG.repoRoot);
    }

    if (targetStep <= 8) {
      logger.step(8, steps.length, steps[7]);

      createGitHubRelease(newVersion, `Successfully published v${newVersion}`);

      logger.success(`Release published successfully! v${newVersion} is live.`);
    }
  } catch (error) {
    logger.error('Release workflow failed. Aborting operations...', error);
    process.exit(1);
  } finally {
    if (worktreePath) {
      cleanupReleaseWorktree();
    }
  }
}
