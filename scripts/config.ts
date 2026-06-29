import path from 'node:path';

export const CONFIG = {
  projectName: 'shady-release-cli',
  packageManager: 'npm',
  npmBranch: 'npm-release', // The dedicated branch you sync to
  cliPackageName: 'shady-cph',
  cliPackagePath: path.resolve(process.cwd(), 'packages/cli'),
  distPath: path.resolve(process.cwd(), 'packages/cli/dist'),
  repoRoot: process.cwd(),
};
