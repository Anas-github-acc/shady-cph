import fs from 'fs-extra';
import { spawn } from 'node:child_process';
import { loadConfig } from '../core/config.js';
import { getDaemonPaths } from '../core/daemonPaths.js';
import { logger } from '../utils/logger.js';

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e.code === 'EPERM';
  }
}

export async function runCommand(opts: { port?: number }) {
  const config = await loadConfig();
  const port = opts.port ?? config.server.port;
  const paths = getDaemonPaths();

  // Check existing PID
  if (await fs.pathExists(paths.pid)) {
    try {
      const pidStr = await fs.readFile(paths.pid, 'utf-8');
      const pid = parseInt(pidStr.trim(), 10);
      if (!isNaN(pid) && isProcessRunning(pid)) {
        logger.error(`Server is already running with PID ${pid}.`);
        process.exit(1);
      }
    } catch (err) {
      // Ignore error and proceed
    }
  }

  // Ensure ~/.shady exists
  await fs.ensureDir(paths.dir);

  // Open log file in append mode
  const logStream = fs.openSync(paths.log, 'a');

  // Prepare arguments for spawning the daemon subcommand
  const args = [process.argv[1], 'daemon'];
  if (opts.port) {
    args.push('--port', String(opts.port));
  }

  // Spawn detached daemon
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: ['ignore', logStream, logStream],
    cwd: process.cwd(),
  });

  const pid = child.pid;
  if (!pid) {
    logger.error('Failed to spawn daemon process.');
    process.exit(1);
  }

  // Writes server.pid
  await fs.writeFile(paths.pid, String(pid), 'utf-8');

  // Writes server.json
  const serverJson = {
    pid,
    port,
    startedAt: new Date().toISOString(),
    cwd: process.cwd(),
  };
  await fs.writeJson(paths.json, serverJson, { spaces: 2 });

  child.unref();

  logger.success(`Server started in background (PID: ${pid}, Port: ${port}).`);
}
