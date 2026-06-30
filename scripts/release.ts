// scripts/release.ts
import { execFileSync } from 'node:child_process';
import { CONFIG } from './config.js';
import { git, isGitClean } from './git.js';
import { logger } from './logger.js';
import { setupReleaseWorktree, cleanupReleaseWorktree } from './worktree.js';
import { syncDirectories, copyPackageMetadata, clearWorktree } from './copy.js';
import { getPackageManifest, writeReleaseManifest } from './version.js';
import { runNpmPublish, createGitHubRelease } from './publish.js';
import path from 'node:path';

export function runReleaseCommand(skipRelease: boolean = false): void {
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
  
  let calculatedVersion: string | null = null;
  let hasCreatedLocalTag = false;
  let rollbackNeeded = false;

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
    calculatedVersion = updatedManifest.version;
    const tagName = `${calculatedVersion}-${CONFIG.packageManager}`;
    logger.info(`Target release version calculated: ${tagName}`);

    logger.step(3, steps.length, steps[2]);
    execFileSync('pnpm', ['--filter', `${CONFIG.cliPackageName}`, 'build'], {
      cwd: CONFIG.repoRoot,
      stdio: 'inherit'
    });

    logger.step(4, steps.length, steps[3]);
    worktreePath = setupReleaseWorktree();
    
    clearWorktree(worktreePath);
    const targetDistPath = path.join(worktreePath, 'dist');
    
    syncDirectories(CONFIG.distPath, targetDistPath);
    copyPackageMetadata(worktreePath);
    writeReleaseManifest(worktreePath, CONFIG.cliPackagePath);

    git(['add', '.'], worktreePath);
    
    const status = git(['status', '--porcelain'], worktreePath);
    if (status.length > 0) {
      git(['commit', '-m', `release: ${tagName}`], worktreePath);
      logger.success('Release changes committed to isolation branch.');
    } else {
      git(['commit', '--allow-empty', '-m', `release: ${tagName} (no-op build change)`], worktreePath);
      logger.warn('No build file changes detected. Created an empty tracking commit for tag matching.');
    }

    logger.step(5, steps.length, steps[4]);
    git(['tag', '-a', tagName, '-m', `Release ${tagName}`], worktreePath);
    hasCreatedLocalTag = true;
    logger.success(`Local tag ${tagName} generated successfully.`);
    
    logger.step(6, steps.length, steps[5]);
    rollbackNeeded = true;

    if (!skipRelease) {
      runNpmPublish(worktreePath);
      logger.success('Package deployed to global npm registry successfully.');
    } else {
      logger.info('Skipping NPM Release')
    }

    logger.step(7, steps.length, steps[6]);
    
    logger.info('Pushing release branch and tracking tags up to origin...');
    git(['push', 'origin', CONFIG.npmBranch], worktreePath);
    git(['push', 'origin', tagName], worktreePath);

    logger.info('Syncing monorepo parent changelogs and version definitions to main...');
    git(['add', '.'], CONFIG.repoRoot);

    try {
      git(['diff', '--cached', '--quiet'], CONFIG.repoRoot, true);
      console.log('No changes to commit. Skipping commit.');
    } catch {
      git(['commit', '-m', `chore: version bump ${tagName} [skip ci]`], CONFIG.repoRoot);
      git(['push'], CONFIG.repoRoot);
    }


    logger.step(8, steps.length, steps[7]);
    createGitHubRelease(calculatedVersion, tagName, `Successfully published ${tagName}`);

    logger.success(`Release published successfully! ${tagName} is fully live.`);
  } catch (error) {
    logger.error('Release workflow failed. Initiating automated repository rollback...', error);
    
    if (rollbackNeeded) {
      try {
        if (hasCreatedLocalTag && calculatedVersion) {
          const tagName = `${calculatedVersion}-${CONFIG.packageManager}`;
          logger.warn(`Rolling back local tag reference: ${tagName}`);
          try {
            git(['tag', '-d', tagName], CONFIG.repoRoot);
          } catch {}
          if (worktreePath) {
            try {
              git(['tag', '-d', tagName], worktreePath);
            } catch {}
          }
        }

        logger.warn('Executing Git tree hard reset to restore uncommitted version changesets...');
        git(['reset', '--hard', 'HEAD'], CONFIG.repoRoot);

        logger.success('Repository state successfully rolled back to a safe pre-release baseline.');
      } catch (rollbackError) {
        logger.error('Critical failure: Could not execute automated state recovery.', rollbackError);
      }
    }

    process.exit(1);
  } finally {
    if (worktreePath) {
      cleanupReleaseWorktree();
    }
  }
}
