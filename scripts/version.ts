import fs from 'node:fs';
import path from 'node:path';

export interface PackageManifest {
  name: string;
  version: string;
  [key: string]: any;
}

export function getPackageManifest(dir: string): PackageManifest {
  const targetPath = path.join(dir, 'package.json');
  const content = fs.readFileSync(targetPath, 'utf8');
  return JSON.parse(content);
}

export function writeReleaseManifest(
  worktreeDir: string,
  sourcePkgDir: string
): void {
  const manifestPath = path.join(sourcePkgDir, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Automatically clean up dependencies that use the monorepo workspace protocol
  if (manifest.dependencies) {
    for (const [dep, version] of Object.entries(manifest.dependencies)) {
      if (typeof version === 'string' && version.startsWith('workspace:')) {
        delete manifest.dependencies[dep];
      }
    }
  }

  // Also clean up peer/devDependencies using workspace: protocol if present
  if (manifest.devDependencies) {
    for (const [dep, version] of Object.entries(manifest.devDependencies)) {
      if (typeof version === 'string' && version.startsWith('workspace:')) {
        delete manifest.devDependencies[dep];
      }
    }
  }

  const targetPath = path.join(worktreeDir, 'package.json');
  fs.writeFileSync(targetPath, JSON.stringify(manifest, null, 2), 'utf8');
}
