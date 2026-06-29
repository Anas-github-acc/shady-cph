#!/usr/bin/env node
import { Command } from 'commander';
import { runSyncCommand } from './sync.js';
import { runReleaseCommand } from './release.js';
import { logger } from './logger.js';

const program = new Command();

program
  .name('shady-release')
  .description('Custom release and synchronization engine for the monorepo')
  .version('1.0.0');

program
  .command('sync')
  .description('Build the CLI and sync changes to the dedicated npm branch without updating versions')
  .action(() => {
    runSyncCommand();
  });

program
  .command('release')
  .description('Consume changesets, bump versions, build, sync, tag, and publish to npm/GitHub')
  .action(() => {
    runReleaseCommand();
  });

// Handle uncaught errors gracefully
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection encountered:', reason);
  process.exit(1);
});

program.parse(process.argv);
