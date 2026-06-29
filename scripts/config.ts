import path from 'node:path';

export const CONFIG = {
  projectName: 'shady-release-cli',
  packageManager: 'npm',
  npmBranch: 'npm-release', // The dedicated branch you sync to
  cliPackagePath: path.resolve(process.cwd(), 'packages/shady'),
  distPath: path.resolve(process.cwd(), 'packages/shady/dist'),
  repoRoot: process.cwd(),
};
