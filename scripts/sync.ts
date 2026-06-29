// scripts/sync.ts
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { CONFIG } from './config.js';
import { git } from './git.js';
import { logger } from './logger.js';
import { setupReleaseWorktree, cleanupReleaseWorktree } from './worktree.js';
import { syncDirectories, copyPackageMetadata, clearWorktree } from './copy.js';

export function runSyncCommand(startStep?: number): void {
  const steps = [
    'Validating workspace state',
    'Building CLI package (pnpm build)',
    'Ensuring Git worktree for npm branch exists',
    'Synchronizing built files to worktree',
    'Committing sync changes',
  ];

  logger.info('Starting sync workflow...');
  let worktreePath: string | null = null;
  const targetStep = startStep || 1;

  try {
    if (targetStep <= 1) {
      logger.step(1, steps.length, steps[0]);
    } else {
      logger.warn(`Skipping Step 1: ${steps[0]}`);
    }

    if (targetStep <= 2) {
      logger.step(2, steps.length, steps[1]);
      logger.info('Compiling TypeScript distribution bundles...');

      execFileSync('pnpm', ['--filter', `${CONFIG.cliPackageName}`, 'build'], {
        cwd: CONFIG.repoRoot,
        stdio: 'inherit',
      });
    } else {
      logger.warn(`Skipping Step 2: ${steps[1]}`);
    }

    if (targetStep <= 3) {
      logger.step(3, steps.length, steps[2]);
      worktreePath = setupReleaseWorktree();
    } else {
      logger.warn(`Skipping Step 3: ${steps[2]}`);
      worktreePath = path.resolve(CONFIG.repoRoot, '.git/safe-worktree-sync');
    }

    if (targetStep <= 4) {
      logger.step(4, steps.length, steps[3]);

      clearWorktree(worktreePath);
      logger.info(`Mirroring built artifacts from ${CONFIG.distPath} to worktree`);
      syncDirectories(CONFIG.distPath, worktreePath);
      copyPackageMetadata(worktreePath);
    } else {
      logger.warn(`Skipping Step 4: ${steps[3]}`);
    }

    if (targetStep <= 5) {
      logger.step(5, steps.length, steps[4]);

      git(['add', '.'], worktreePath);
      const status = git(['status', '--porcelain'], worktreePath);
      if (status.length > 0) {
        git(
          ['commit', '-m', `chore: sync packages changes at ${new Date().toISOString()}`],
          worktreePath
        );

        logger.success('Changes committed to isolation branch.');
      } else {
        logger.warn('No new compile diff found. Skipping empty sync commit.');
      }
    } else {
      logger.warn(`Skipping Step 5: ${steps[4]}`);
    }

    logger.success('Sync completed successfully. Dev runtime up to date.');
  } catch (error) {
    logger.error(
      'Sync workflow failed natively during file operations.',
      error
    );
    process.exit(1);
  } finally {
    if (worktreePath && targetStep <= 3) {
      cleanupReleaseWorktree();
    }
  }
}
