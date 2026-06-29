import fs from 'node:fs';
import path from 'node:path';

export function syncDirectories(srcDir: string, destDir: string): void {
  const items = fs.readdir(srcDir, { withFileTypes: true });

  const destItems = fs.readdir(destDir).catch(() => [] as string[]);
  for (const item of destItems) {
    if (item === '.git' || item === '.gitignore') continue;
    fs.rm(path.join(destDir, item), { recursive: true, force: true });
  }

  for (const item of items) {
    const srcPath = path.join(srcDir, item.name);
    const destPath = path.join(destDir, item.name);

    if (item.isDirectory()) {
      fs.mkdir(destPath, { recursive: true });
      syncDirectories(srcPath, destPath);
    } else {
      fs.copyFile(srcPath, destPath);
    }
  }
}
