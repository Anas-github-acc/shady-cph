import fs from 'fs-extra';
import { getDaemonPaths } from '../core/daemonPaths.js';

export async function logsCommand() {
  const paths = getDaemonPaths();
  if (!(await fs.pathExists(paths.log))) {
    console.log(`No log file found at ${paths.log}. Is the server running?`);
    return;
  }

  // Print existing logs
  const initialContent = await fs.readFile(paths.log, 'utf-8');
  process.stdout.write(initialContent);

  // Track file size to read only new content
  let position = (await fs.stat(paths.log)).size;

  const fd = await fs.open(paths.log, 'r');

  const watcher = fs.watch(paths.log, async (event) => {
    if (event === 'change') {
      try {
        const stats = await fs.stat(paths.log);
        if (stats.size > position) {
          const length = stats.size - position;
          const buffer = Buffer.alloc(length);
          await fs.read(fd, buffer, 0, length, position);
          process.stdout.write(buffer.toString('utf-8'));
          position = stats.size;
        } else if (stats.size < position) {
          // File was truncated or rotated
          position = stats.size;
        }
      } catch (err) {
        // Handle potential errors
      }
    }
  });

  // Keep the process alive and handle termination gracefully
  process.on('SIGINT', () => {
    watcher.close();
    fs.close(fd).catch(() => {});
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    watcher.close();
    fs.close(fd).catch(() => {});
    process.exit(0);
  });
}
