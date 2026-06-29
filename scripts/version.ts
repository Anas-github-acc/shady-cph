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
  const sourceManifest = getPackageManifest(sourcePkgDir);

  // Clean up monorepo-specific fields (like relative paths, workspace: protocols)
  // so the package is immediately ready for clean global npm installations.
  const releaseManifest: PackageManifest = {
    ...sourceManifest,
  };

  // Strip out development configurations not needed on the release branch
  delete releaseManifest.devDependencies;
  delete releaseManifest.scripts;

  fs.writeFileSync(
    path.join(worktreeDir, 'package.json'),
    JSON.stringify(releaseManifest, null, 2),
    'utf8'
  );
}
