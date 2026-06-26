import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dist/cli.js sits next to ../package.json once built, so this works both
// in dev (src/core/version.ts -> ../../package.json) and in the built dist.
function resolvePackageJsonPath(): string {
  const distCandidate = path.resolve(__dirname, '..', 'package.json');
  const srcCandidate = path.resolve(__dirname, '..', '..', 'package.json');
  return fs.pathExistsSync(distCandidate) ? distCandidate : srcCandidate;
}

let cached: string | null = null;

export function getCliVersion(): string {
  if (cached) return cached;
  const pkgPath = resolvePackageJsonPath();
  const pkg = fs.readJsonSync(pkgPath);
  cached = pkg.version as string;
  return cached;
}
