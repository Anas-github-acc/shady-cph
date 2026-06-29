import fs from 'fs-extra';
import { getDaemonPaths } from '../core/daemonPaths.js';
import { isProcessRunning } from './run.js';
import { logger } from '../utils/logger.js';

export async function stopCommand() {
  const paths = getDaemonPaths();

  if (!(await fs.pathExists(paths.pid))) {
    logger.info('Server is not running.');
    if (await fs.pathExists(paths.json)) {
      await fs.remove(paths.json).catch(() => {});
    }
    return;
  }

  let pid: number;
  try {
    const pidStr = await fs.readFile(paths.pid, 'utf-8');
    pid = parseInt(pidStr.trim(), 10);
  } catch (err) {
    logger.error('Failed to read server.pid.');
    return;
  }

  if (isNaN(pid) || !isProcessRunning(pid)) {
    logger.warn('Server is not running, but stale files were found. Cleaning up...');
    await fs.remove(paths.pid).catch(() => {});
    await fs.remove(paths.json).catch(() => {});
    return;
  }

  logger.info(`Stopping server (PID: ${pid})...`);
  try {
    process.kill(pid, 'SIGTERM');
  } catch (err: any) {
    logger.error(`Failed to send SIGTERM to process ${pid}: ${err.message}`);
    return;
  }

  // Wait for the process to exit
  let exited = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (!isProcessRunning(pid)) {
      exited = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!exited) {
    logger.warn('Server did not stop within 5 seconds. Sending SIGKILL...');
    try {
      process.kill(pid, 'SIGKILL');
      for (let attempt = 0; attempt < 20; attempt++) {
        if (!isProcessRunning(pid)) {
          exited = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err: any) {
      logger.error(`Failed to send SIGKILL: ${err.message}`);
    }
  }

  // Clean stale files if needed (if daemon didn't do it on shutdown)
  await fs.remove(paths.pid).catch(() => {});
  await fs.remove(paths.json).catch(() => {});

  if (exited) {
    logger.success('Server stopped.');
  } else {
    logger.error('Failed to stop the server.');
  }
}
