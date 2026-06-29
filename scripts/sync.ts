// scripts/sync.ts
import { execFileSync } from 'node:child_process';
import { CONFIG } from './config.js';
import { git } from './git.js';
import { logger } from './logger.js';
import {
  setupReleaseWorktree,
  cleanupReleaseWorktree,
} from './worktree.js';
import { syncDirectories } from './copy.js';

export function runSyncCommand(): void {
  const steps = [
    'Validating workspace state',
    'Building CLI package (pnpm build)',
    'Ensuring Git worktree for npm branch exists',
    'Synchronizing built files to worktree',
    'Committing sync changes',
  ];

  logger.info('Starting sync workflow...');
  let worktreePath: string | null = null;

  try {
    logger.step(1, steps.length, steps[0]);

    logger.step(2, steps.length, steps[1]);
    logger.info('Compiling TypeScript distribution bundles...');

    execFileSync('pnpm', ['--filter', 'shady', 'build'], {
      cwd: CONFIG.repoRoot,
      stdio: 'inherit',
    });

    logger.step(3, steps.length, steps[2]);
    worktreePath = setupReleaseWorktree();

    logger.step(4, steps.length, steps[3]);
    logger.info(
      `Mirroring built artifacts from ${CONFIG.distPath} to worktree`
    );

    syncDirectories(CONFIG.distPath, worktreePath);

    logger.step(5, steps.length, steps[4]);

    git(['add', '-A'], worktreePath);

    const status = git(['status', '--porcelain'], worktreePath);

    if (status.stdout.length > 0) {
      git(
        [
          'commit',
          '-m',
          `chore: sync packages changes at ${new Date().toISOString()}`,
        ],
        worktreePath
      );

      logger.success('Changes committed to isolation branch.');
    } else {
      logger.warn('No new compile diff found. Skipping empty sync commit.');
    }

    logger.success('Sync completed successfully. Dev runtime up to date.');
  } catch (error) {
    logger.error(
      'Sync workflow failed natively during file operations.',
      error
    );
    process.exit(1);
  } finally {
    if (worktreePath) {
      cleanupReleaseWorktree();
    }
  }
}
