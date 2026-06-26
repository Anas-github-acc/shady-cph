import fs from 'fs-extra';
import path from 'node:path';
import prompts from 'prompts';
import { logger } from '../utils/logger.js';
import { configExists, configPath, saveConfig, ConfigSchema, CONFIG_FILENAME } from '../core/config.js';
import { getCliVersion } from '../core/version.js';

export async function initCommand(opts: { yes?: boolean }) {
  const cwd = process.cwd();

  if (await configExists(cwd)) {
    const { overwrite } = opts.yes
      ? { overwrite: true }
      : await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `${CONFIG_FILENAME} already exists. Re-initialize (testcases are kept)?`,
          initial: false
        });

    if (!overwrite) {
      logger.info('Aborted.');
      return;
    }
  }

  const answers = opts.yes
    ? { port: 42585, testcaseDir: './.testcase' }
    : await prompts([
        { type: 'number', name: 'port', message: 'Server port (for the browser extension)', initial: 42585 },
        { type: 'text', name: 'testcaseDir', message: 'Testcase directory', initial: './.testcase' }
      ]);

  if (!answers.testcaseDir) {
    logger.warn('Aborted.');
    return;
  }

  const config = ConfigSchema.parse({
    version: getCliVersion(),
    server: { port: answers.port },
    testcase: { dir: answers.testcaseDir }
  });

  await fs.ensureDir(path.resolve(cwd, answers.testcaseDir));
  await saveConfig(config, cwd);

  logger.success(`Created ${CONFIG_FILENAME}`);
  logger.success(`Created testcase directory at ${answers.testcaseDir}`);
  logger.plain('');
  logger.info(`Next: run "sd run" and point your browser extension at port ${config.server.port}.`);
  logger.info(`Config saved to ${configPath(cwd)}`);
}
