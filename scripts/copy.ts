// scripts/copy.ts
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.js';
import { git } from './git.js';
import { logger } from './logger.js';

/**
 * Forcefully clears out the git index and tracked/untracked physical files
 * on the isolated worktree to ensure a completely pristine blank slate.
 */
export function clearWorktree(worktreeDir: string): void {
  logger.info('Purging old tracked and untracked files from release branch...');

  try {
    git(['rm', '-rf', '.'], worktreeDir);
  } catch {
    // Quietly pass if the branch is already completely empty/orphan
  }

  if (fs.existsSync(worktreeDir)) {
    const items = fs.readdirSync(worktreeDir);
    for (const item of items) {
      if (item === '.git') continue; // CRITICAL: Never delete the git lifecycle pointer
      fs.rmSync(path.join(worktreeDir, item), { recursive: true, force: true });
    }
  }
}

/**
 * Copies compiled assets directly from a source into a target destination folder.
 * Highly robust recursive tree copy.
 */
export function syncDirectories(srcDir: string, destDir: string): void {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Source distribution directory does not exist: ${srcDir}`);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const items = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const item of items) {
    const srcPath = path.join(srcDir, item.name);
    const destPath = path.join(destDir, item.name);

    if (item.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      syncDirectories(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Injects required configuration files directly into the root of the worktree branch.
 */
export function copyPackageMetadata(worktreeDir: string): void {
  const metadataFiles = [
    '.gitattributes',
    '.gitignore',
    '.npmignore',
    'LICENSE',
    'README.md'
  ];

  logger.info('Injecting required package configuration and layout files...');

  for (const filename of metadataFiles) {
    const srcPath = path.join(CONFIG.cliPackagePath, filename);
    const destPath = path.join(worktreeDir, filename);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    } else {
      const rootSrcPath = path.join(CONFIG.repoRoot, filename);
      if (fs.existsSync(rootSrcPath)) {
        fs.copyFileSync(rootSrcPath, destPath);
      }
    }
  }
}
