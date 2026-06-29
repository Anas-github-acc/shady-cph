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
    // Step 1: Verify Clean Environment
    logger.step(1, steps.length, steps[0]);
    if (!isGitClean()) {
      throw new Error('Working directory contains uncommitted changes. Please stash or commit first.');
    }

    // Step 2: Consume Changesets
    logger.step(2, steps.length, steps[1]);
    logger.info('Consuming markdown logs and generating version increments...');
    execFileSync('pnpm', ['changeset', 'version'], {
      cwd: CONFIG.repoRoot,
      stdio: 'inherit'
    });

    // Read the newly minted version number out of the updated package source
    const updatedManifest = getPackageManifest(CONFIG.cliPackagePath);
    const newVersion = updatedManifest.version;
    logger.info(`Target release version calculated: v${newVersion}`);

    // Step 3: Run Production Build
    logger.step(3, steps.length, steps[2]);
    execFileSync('pnpm', ['--filter', 'shady', 'build'], {
      cwd: CONFIG.repoRoot,
      stdio: 'inherit'
    });

    // Step 4: Setup Isolation Worktree & Sync Files
    logger.step(4, steps.length, steps[3]);
    worktreePath = setupReleaseWorktree();

    // Mirror distribution bundles using our atomic system
    syncDirectories(CONFIG.distPath, worktreePath);

    // Write out the modified, deployment-safe package.json right to the root of the worktree
    writeReleaseManifest(worktreePath, CONFIG.cliPackagePath);

    // Commit the release changes natively on the isolated tracking branch
    git(['add', '.'], worktreePath);
    git(['commit', '-m', `release: v${newVersion}`], worktreePath);

    // Step 5: Creating local Git Tag tracking the isolation commit
    logger.step(5, steps.length, steps[4]);
    git(['tag', '-a', `v${newVersion}`, '-m', `Release v${newVersion}`], worktreePath);

    // Step 6: Publish target to npm registry straight out of the worktree folder
    logger.step(6, steps.length, steps[5]);
    runNpmPublish(worktreePath);

    // Step 7: Push isolation commits and tags up to remote GitHub origin
    logger.step(7, steps.length, steps[6]);
    git(['push', 'origin', CONFIG.npmBranch], worktreePath);
    git(['push', 'origin', `v${newVersion}`], worktreePath);

    // Step 8: Push the main working branch changes too (so package.json version updates match)
    git(['add', '.'], CONFIG.repoRoot);
    git(['commit', '-m', `chore: version bump v${newVersion} [skip ci]`], CONFIG.repoRoot);
    git(['push'], CONFIG.repoRoot);

    // Step 9: Generate GitHub Release info
    logger.step(8, steps.length, steps[7]);

    // Optionally parse latest CHANGELOG text line to push directly to GitHub release notes
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
