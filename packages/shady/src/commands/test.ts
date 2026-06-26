import path from 'node:path';
import fg from 'fast-glob';
import fs from 'fs-extra';
import { loadConfig, resolveTestcaseDir } from '../core/config.js';
import { readRunLatest, readTestCases } from '../core/testcase.js';
import { diffOutputs } from '../core/diff.js';
import { prepareSolutionRunner } from '../core/runner.js';
import { logger, kleur } from '../utils/logger.js';

export interface TestCommandOptions {
  problem?: string;
  platform?: string;
}

async function resolveTestcaseFile(testcaseDir: string, opts: TestCommandOptions): Promise<string> {
  if (opts.problem) {
    const pattern = opts.platform
      ? `${opts.problem}.${opts.platform}.test`
      : `${opts.problem}.*.test`;
    const matches = await fg(pattern, { cwd: testcaseDir, absolute: true });
    if (matches.length === 0) {
      throw new Error(`No saved testcase matching "${pattern}" in ${testcaseDir}`);
    }
    if (matches.length > 1) {
      throw new Error(
        `Multiple platforms found for problem "${opts.problem}": ${matches
          .map((m) => path.basename(m))
          .join(', ')}. Disambiguate with --platform.`
      );
    }
    return matches[0];
  }

  const latest = await readRunLatest(testcaseDir);
  if (!latest) {
    throw new Error(
      'No testcase specified and no .run-latest found. Pass --problem <number>, or run "sd run" and send a testcase first.'
    );
  }
  return path.join(testcaseDir, latest);
}

export async function testCommand(solutionFile: string, opts: TestCommandOptions) {
  const config = await loadConfig();
  const testcaseDir = resolveTestcaseDir(config);

  const resolvedSolution = path.resolve(process.cwd(), solutionFile);
  if (!(await fs.pathExists(resolvedSolution))) {
    logger.error(`Solution file not found: ${resolvedSolution}`);
    process.exitCode = 1;
    return;
  }

  let testcaseFile: string;
  try {
    testcaseFile = await resolveTestcaseFile(testcaseDir, opts);
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }

  const cases = await readTestCases(testcaseFile);
  logger.info(`Running ${path.basename(solutionFile)} against ${path.basename(testcaseFile)} (${cases.length} case(s))`);
  logger.plain('');

  const { run, spawnError } = await prepareSolutionRunner(config, resolvedSolution);

  if (spawnError) {
    logger.error('Spawn/compile error:');
    logger.plain(kleur.red(spawnError));
    process.exitCode = 1;
    return;
  }

  let passed = 0;

  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    const spinner = logger.spinner(`Test case ${i + 1}/${cases.length}...`);
    const result = await run(tc.input);
    spinner.stop();

    logger.plain(kleur.bold(`Test case ${i + 1}/${cases.length}`));
    logger.plain(kleur.dim('input:'));
    logger.plain(indent(tc.input));

    if (result.spawnError) {
      logger.error(`Spawn error: ${result.spawnError}`);
      logger.plain('');
      continue;
    }

    if (result.timedOut) {
      logger.error(`Timed out after ${config.timeoutMs}ms`);
      logger.plain('');
      continue;
    }

    const { matched, rendered } = diffOutputs(tc.output, result.stdout);

    if (matched) {
      passed++;
      logger.success(kleur.green('PASSED'));
    } else {
      logger.error(kleur.red('FAILED'));
      logger.plain(kleur.dim('diff (- expected / + actual):'));
      logger.plain(indent(rendered.join('\n')));
    }

    if (result.exitCode !== 0) {
      logger.warn(`Process exited with code ${result.exitCode}`);
    }
    if (result.stderr.trim()) {
      logger.plain(kleur.dim('stderr:'));
      logger.plain(indent(kleur.yellow(result.stderr.trim())));
    }

    logger.plain('');
  }

  const summaryColor = passed === cases.length ? kleur.green : kleur.red;
  logger.plain(kleur.bold(summaryColor(`${passed}/${cases.length} test case(s) passed`)));

  process.exitCode = passed === cases.length ? 0 : 1;
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n');
}
