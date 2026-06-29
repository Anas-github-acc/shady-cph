import fs from "node:fs";
import path from "node:path";

export function syncDirectories(srcDir: string, destDir: string): void {
  const items = fs.readdirSync(srcDir, { withFileTypes: true });

  const destItems = fs.existsSync(destDir)
    ? fs.readdirSync(destDir)
    : [];

  for (const item of destItems) {
    if (item === ".git" || item === ".gitignore") continue;

    fs.rmSync(path.join(destDir, item), {
      recursive: true,
      force: true,
    });
  }

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
