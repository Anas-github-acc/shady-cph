import os from 'node:os';
import path from 'node:path';

export function getDaemonPaths() {
  const shadyDir = path.join(os.homedir(), '.shady');
  return {
    dir: shadyDir,
    pid: path.join(shadyDir, 'server.pid'),
    json: path.join(shadyDir, 'server.json'),
    log: path.join(shadyDir, 'server.log'),
  };
}
