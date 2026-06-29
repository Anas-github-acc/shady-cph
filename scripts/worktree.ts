// scripts/worktree.ts
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.js';
import { git, getCurrentBranch } from './git.js';
import { logger } from './logger.js';

const WORKTREE_DIR = path.resolve(CONFIG.repoRoot, '.git/safe-worktree-sync');

export function setupReleaseWorktree(): string {
  // 1. Clean up any previous broken worktrees
  cleanupReleaseWorktree();

  // 2. Prevent crashing if the main directory is currently sitting on npm-release
  const activeBranch = getCurrentBranch();
  if (activeBranch === CONFIG.npmBranch) {
    throw new Error(
      `Your main working directory is currently on "${CONFIG.npmBranch}". ` +
      `Please checkout your development branch (e.g., main/dev) before running this script.`
    );
  }

  logger.info(`Setting up isolated worktree for branch: ${CONFIG.npmBranch}`);

  // 3. Check if the branch exists anywhere (locally or on remote origin)
  try {
    try {
      git(["show-ref", "--verify", `refs/heads/${CONFIG.npmBranch}`]);
    } catch {
      git(["ls-remote", "--exit-code", "--heads", "origin", CONFIG.npmBranch,]);
      git(["fetch", "origin", CONFIG.npmBranch]);
    }
    git(['worktree', 'add', WORKTREE_DIR, CONFIG.npmBranch]);
  } catch {
    logger.warn(`Branch ${CONFIG.npmBranch} not found. Creating a clean, isolated orphan branch directly...`);

    git(['worktree', 'add', '--detach', WORKTREE_DIR]);
    git(['checkout', '--orphan', CONFIG.npmBranch], WORKTREE_DIR);
    git(['reset', '--hard'], WORKTREE_DIR);
    git(['commit', '--allow-empty', '-m', 'chore: initial npm branch commit'], WORKTREE_DIR);
  }

  return WORKTREE_DIR;
}

export function cleanupReleaseWorktree(): void {
  try {
    const stdout = git(['worktree', 'list']);

    if (stdout.includes(WORKTREE_DIR)) {
      logger.info('Pruning old git worktree allocation...');
      git(['worktree', 'remove', '--force', WORKTREE_DIR]);
    }
  } catch {
    // Fail silently if not fully registered
  }

  try {
    fs.rmSync(WORKTREE_DIR, {
      recursive: true,
      force: true,
    });
  } catch {}
}


