import { Command } from 'commander';
import { initCommand } from './core/init.js';
import { runCommand } from './commands/run.js';
import { testCommand } from './commands/test.js';
import { runDaemon } from './core/daemon.js';
import { statusCommand } from './commands/status.js';
import { stopCommand } from './commands/stop.js';
import { logsCommand } from './commands/logs.js';
import { cleanCommand } from './commands/clean.js';
import { submitCommand } from './commands/submit.js';
import { getCliVersion } from './core/version.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('sd')
  .description('shady-cph: a competitive-programming runner that receives testcases from other cp platform via on specific port (defined in shady.json) or via our browser extension (shady-cph-parser)')
  .version(getCliVersion());

program
  .command('init')
  .description('Initialize shady.json and the testcase directory in the current folder')
  .option('-y, --yes', 'Skip prompts and use defaults', false)
  .action(async (opts) => {
    await initCommand(opts);
  });

program
  .command('run')
  .description('Start the local server in the background to listen for testcases')
  .option('-p, --port <port>', 'Override the port from shady.json', (v) => parseInt(v, 10))
  .action(async (opts) => {
    await runCommand(opts);
  });

program
  .command('daemon', { hidden: true })
  .description('Internal background server daemon process')
  .option('-p, --port <port>', 'Override the port from shady.json', (v) => parseInt(v, 10))
  .action(async (opts) => {
    await runDaemon(opts);
  });

program
  .command('status')
  .description('Check the status of the background server')
  .action(async () => {
    await statusCommand();
  });

program
  .command('stop')
  .description('Stop the running background server')
  .action(async () => {
    await stopCommand();
  });

program
  .command('logs')
  .description('View and tail the background server logs')
  .action(async () => {
    await logsCommand();
  });

program
  .command('clean')
  .description('Stop server and clean all testcase files')
  .action(async () => {
    await cleanCommand();
  });

program
  .command('submit')
  .argument('<solution>', 'Path to your solution file (e.g. ./solutions/1230A.cpp)')
  .option('-c, --compiler <compiler_id>', 'Optional compiler/programTypeID override (e.g. "54" for G++17)')
  .description('Submit your solution code to the browser extension')
  .action(async (solution, opts) => {
    await submitCommand(solution, opts);
  });

program
  .command('test')
  .argument('<solution>', 'Path to your solution file (e.g. ./solutions/1230A.cpp)')
  .option('--problem <number>', 'Run against a specific saved problem number instead of the latest received testcase')
  .option('--platform <platform>', 'Disambiguate platform when --problem matches multiple files')
  .description('Run a solution against saved testcases and diff the output')
  .action(async (solution, opts) => {
    await testCommand(solution, opts);
  });

program.parseAsync(process.argv).catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
