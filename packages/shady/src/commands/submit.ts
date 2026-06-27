import fs from 'fs-extra';
import path from 'node:path';
import http from 'node:http';
import { loadConfig, resolveTestcaseDir } from '../core/config.js';
import { readRunLatest } from '../core/testcase.js';
import { getDaemonPaths } from '../core/daemonPaths.js';
import { logger } from '../utils/logger.js';

interface SubmitOptions {
  compiler?: string;
}

function postSubmission(port: number, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: '/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 5000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.write(postData);
    req.end();
  });
}

export async function submitCommand(solutionFile: string, opts: SubmitOptions) {
  const config = await loadConfig();
  const testcaseDir = resolveTestcaseDir(config);

  const resolvedSolution = path.resolve(process.cwd(), solutionFile);
  if (!(await fs.pathExists(resolvedSolution))) {
    logger.error(`Solution file not found: ${resolvedSolution}`);
    process.exitCode = 1;
    return;
  }

  const ext = path.extname(resolvedSolution).replace('.', '');
  const langConfig = config.languages[ext];

  const programTypeId = opts.compiler ?? langConfig?.submissionCompiler;

  let problemNumber: string;
  try {
    const latest = await readRunLatest(testcaseDir);
    if (!latest) {
      logger.error('No latest run problem found in .run-latest. Run "sd test" or receive a testcase first.');
      process.exitCode = 1;
      return;
    }
    const parts = latest.split('.');
    problemNumber = parts[0];
  } catch (err: any) {
    logger.error(`Failed to read latest run problem: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const filename = `${problemNumber}.${ext}`;
  const sourceCode = await fs.readFile(resolvedSolution, 'utf-8');

  const paths = getDaemonPaths();
  if (!(await fs.pathExists(paths.json))) {
    logger.error('Server is not running. Start the server first with "sd run".');
    process.exitCode = 1;
    return;
  }

  let serverData;
  try {
    serverData = await fs.readJson(paths.json);
  } catch (err) {
    logger.error('Failed to read server status.');
    process.exitCode = 1;
    return;
  }

  const port = serverData.port;

  logger.info(`Submitting ${path.basename(resolvedSolution)} for question ${problemNumber}...`);

  try {
    const result = await postSubmission(port, {
      sourceCode,
      filename,
      programTypeId,
      language: ext,
    });

    if (result.ok) {
      logger.success('Submission relayed to browser extension successfully!');
    } else {
      logger.error(`Submission failed: ${result.error}`);
      process.exitCode = 1;
    }
  } catch (err: any) {
    logger.error(`Failed to submit code to local server: ${err.message}`);
    process.exitCode = 1;
  }
}
