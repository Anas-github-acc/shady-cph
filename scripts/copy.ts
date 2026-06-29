// scripts/copy.ts
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.js';
import { logger } from './logger.js';

export function syncDirectories(srcDir: string, destDir: string): void {
  const items = fs.readdirSync(srcDir, { withFileTypes: true }); // read everything in /dist

  try {
    const destItems = fs.readdirSync(destDir);
    for (const item of destItems) {
      if (item === '.git' || item === '.gitignore' || item === 'node_modules') {
        // Explicitly wipe node_modules out if a process generated it inside the worktree
        if (item === 'node_modules') {
          fs.rmSync(path.join(destDir, item), { recursive: true, force: true });
        }
        continue;
      }
      fs.rmSync(path.join(destDir, item), { recursive: true, force: true });
    }
  } catch {}

  for (const item of items) {
    if (item.name === 'node_modules') continue;

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
 * Copies essential package metadata directly into the release worktree root
 * as indicated by the file configuration shown in image_b1b7f5.png
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
