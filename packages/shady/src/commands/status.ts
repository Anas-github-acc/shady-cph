import fs from 'fs-extra';
import http from 'node:http';
import { getDaemonPaths } from '../core/daemonPaths.js';
import { isProcessRunning } from './run.js';
import { logger } from '../utils/logger.js';

function checkHealth(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 2000 }, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => {
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

export async function statusCommand() {
  const paths = getDaemonPaths();

  if (!(await fs.pathExists(paths.json))) {
    logger.info('Server is not running.');
    return;
  }

  let serverData;
  try {
    serverData = await fs.readJson(paths.json);
  } catch (err) {
    logger.error('Failed to read server.json configuration.');
    return;
  }

  const { pid, port, startedAt } = serverData;

  if (typeof pid !== 'number' || !isProcessRunning(pid)) {
    logger.warn('Server is not running (found stale server.json).');
    return;
  }

  const healthy = await checkHealth(port);
  if (healthy) {
    logger.success(`Server is running (PID: ${pid}, Port: ${port}, Started: ${startedAt}).`);
  } else {
    logger.error(`Server is not responding (PID: ${pid} is active but /health failed).`);
  }
}
