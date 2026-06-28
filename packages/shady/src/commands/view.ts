import fs from 'fs-extra';
import path from 'node:path';
import fg from 'fast-glob';
import { loadConfig, resolveTestcaseDir } from '../core/config.js';
import { readRunLatest } from '../core/testcase.js';
import { logger, kleur } from '../utils/logger.js';

export interface ViewCommandOptions {
  all?: boolean;
}

export async function viewCommand(opts: ViewCommandOptions) {
  const config = await loadConfig();
  const testcaseDir = resolveTestcaseDir(config);

  if (!(await fs.pathExists(testcaseDir))) {
    logger.error(`Testcase directory does not exist: ${testcaseDir}`);
    process.exitCode = 1;
    return;
  }

  let testcaseFiles: string[] = [];

  if (opts.all) {
    testcaseFiles = await fg('*.test', { cwd: testcaseDir, absolute: true });
    if (testcaseFiles.length === 0) {
      logger.error(`No testcase files found in ${testcaseDir}`);
      process.exitCode = 1;
      return;
    }
    testcaseFiles.sort();
  } else {
    const latest = await readRunLatest(testcaseDir);
    if (!latest) {
      logger.error(
        'No latest testcase found. Run "sd run" and send a testcase first, or use --all / -a.'
      );
      process.exitCode = 1;
      return;
    }
    const targetFile = path.join(testcaseDir, latest);
    if (!(await fs.pathExists(targetFile))) {
      logger.error(`Latest testcase file not found: ${latest}`);
      process.exitCode = 1;
      return;
    }
    testcaseFiles = [targetFile];
  }

  for (let i = 0; i < testcaseFiles.length; i++) {
    const file = testcaseFiles[i];
    const fileName = path.basename(file);
    const relativePath = path.relative(process.cwd(), file);

    // Print header
    logger.plain(kleur.bold().cyan(`┌── ${fileName} (${relativePath})`));

    try {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      // If the last line is empty (due to trailing newline), omit it to avoid trailing empty line
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }

      for (const line of lines) {
        if (line === 'INPUT') {
          logger.plain(kleur.bold().blue('│ INPUT'));
        } else if (line === 'OUTPUT') {
          logger.plain(kleur.bold().green('│ OUTPUT'));
        } else if (line.trim() === '@@@ CASE @@@') {
          logger.plain(kleur.yellow('├─ @@@ CASE @@@'));
        } else {
          logger.plain(`│ ${kleur.dim(line)}`);
        }
      }
    } catch (err) {
      logger.error(`Failed to read ${fileName}: ${err instanceof Error ? err.message : String(err)}`);
    }

    logger.plain(kleur.bold().cyan('└───────────────────────────────────'));
    if (i < testcaseFiles.length - 1) {
      logger.plain(''); // spacer between files
    }
  }
}
