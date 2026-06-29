import fs from 'fs-extra';
import { loadConfig, resolveTestcaseDir } from '../core/config.js';
import { stopCommand } from './stop.js';
import { logger } from '../utils/logger.js';

export async function cleanCommand() {
  logger.info('Stopping server before cleaning...');
  await stopCommand();

  const config = await loadConfig();
  const testcaseDir = resolveTestcaseDir(config);

  if (await fs.pathExists(testcaseDir)) {
    await fs.emptyDir(testcaseDir);
    logger.success(`Cleaned all testcase files from ${testcaseDir}.`);
  } else {
    logger.info(`Testcase directory ${testcaseDir} does not exist.`);
  }
}
