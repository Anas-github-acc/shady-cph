import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.js';
import { git } from './git.ts';
import { logger } from './logger.js';

const WORKTREE_DIR = path.resolve(CONFIG.repoRoot, '.git/safe-worktree-sync');

export function setupReleaseWorktree(): string {
  cleanupReleaseWorktree();

  logger.info(`Setting up isolated worktree for branch: ${CONFIG.npmBranch}`);

  try {
    git(["show-ref", "--verify", `refs/remotes/origin/${CONFIG.npmBranch}`]); /* checking local branch */
  } catch {
    logger.warn(`Branch ${CONFIG.npmBranch} not found. Creating a clean, isolated branch...`);
    // Create a temporary detached orphan branch to clear monorepo bloat
    git(['checkout', '--orphan', CONFIG.npmBranch]);
    git(['reset', '--hard']);
    git(['commit', '--allow-empty', '-m', 'chore: initial npm branch commit']);
    // Bounce back to where we were
    git(['checkout', '-']);
  }

  git(['worktree', 'add', WORKTREE_DIR, CONFIG.npmBranch]);
  
  return WORKTREE_DIR;
}

export function cleanupReleaseWorktree(): Promise<void> {
  try {
    const { stdout } = git(['worktree', 'list']);
    if (stdout.includes(WORKTREE_DIR)) {
      logger.info('Pruning old git worktree allocation...');
      git(['worktree', 'remove', '--force', WORKTREE_DIR]);
    }
  } catch {
  }

  try {
    fs.rm(WORKTREE_DIR, { recursive: true, force: true });
  } catch {}
}
