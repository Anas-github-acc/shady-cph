import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import type { ShadyConfig } from './config.js';

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  spawnError?: string;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

function execShell(command: string, input: string, timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: null, timedOut, spawnError: err.message });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code, timedOut });
    });

    child.stdin?.write(input);
    child.stdin?.end();
  });
}

/**
 * Compiles the solution once (if the language needs it) and returns a
 * function that runs it against a single input string.
 */
export async function prepareSolutionRunner(
  config: ShadyConfig,
  solutionFile: string
): Promise<{ run: (input: string) => Promise<RunResult>; spawnError?: string }> {
  const ext = path.extname(solutionFile).replace('.', '');
  const lang = config.languages[ext];

  if (!lang) {
    return {
      run: async () => ({
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        spawnError: `No language config for ".${ext}" files. Add one under "languages" in shady.json.`
      })
    };
  }

  const buildDir = path.join(os.tmpdir(), 'shady-cph-build');
  await fs.ensureDir(buildDir);

  const name = path.basename(solutionFile, path.extname(solutionFile));
  const vars = { file: solutionFile, dir: buildDir, name };

  if (lang.compile) {
    const compileCmd = fillTemplate(lang.compile, vars);
    const result = await execShell(compileCmd, '', config.timeoutMs);
    if (result.exitCode !== 0 || result.spawnError) {
      return {
        run: async () => result,
        spawnError: result.spawnError ?? `Compilation failed (exit ${result.exitCode}):\n${result.stderr}`
      };
    }
  }

  const runCmd = fillTemplate(lang.run, vars);
  return {
    run: (input: string) => execShell(runCmd, input, config.timeoutMs)
  };
}
