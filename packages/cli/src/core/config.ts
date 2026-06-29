import fs from 'fs-extra';
import path from 'node:path';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { getCliVersion } from './version.js';

export const CONFIG_FILENAME = 'shady.json';

// A single language's compile/run commands. {file} = path to solution,
// {dir} = scratch build dir, {name} = solution filename without extension.
const LanguageSchema = z.object({
  compile: z.string().optional(),
  run: z.string(),
  submissionCompiler: z.string().optional()
});

export const ConfigSchema = z.object({
  // Version of shady-cph that generated this config. Checked against the
  // running CLI's own version on every command so configs don't silently
  // drift out of sync with breaking changes in the testcase/server format.
  version: z.string(),

  server: z.object({
    port: z.number().int().positive().default(42585)
  }),

  testcase: z.object({
    dir: z.string().default('./.testcase')
  }),

  // How to compile/run a solution file, keyed by extension (without the dot).
  languages: z.record(z.string(), LanguageSchema).default({
    cpp: {
      compile: 'g++ -O2 -std=c++17 -o {dir}/{name} {file}',
      run: '{dir}/{name}',
      submissionCompiler: '54'
    },
    cc: {
      compile: 'g++ -O2 -std=c++17 -o {dir}/{name} {file}',
      run: '{dir}/{name}',
      submissionCompiler: '89'
    },
    c: {
      compile: 'gcc -O2 -std=c11 -o {dir}/{name} {file}',
      run: '{dir}/{name}',
      submissionCompiler: '43'
    },
    py: {
      run: 'python3 {file}',
      submissionCompiler: '31'
    },
    js: {
      run: 'node {file}',
      submissionCompiler: '55'
    },
    ts: {
      run: 'npx tsx {file}'
    },
    java: {
      compile: 'javac -d {dir} {file}',
      run: 'java -cp {dir} {name}',
      submissionCompiler: '87'
    },
    go: {
      compile: 'go build -o {dir}/{name} {file}',
      run: '{dir}/{name}',
      submissionCompiler: '32'
    },
    rs: {
      compile: 'rustc -O -o {dir}/{name} {file}',
      run: '{dir}/{name}',
      submissionCompiler: '75'
    }
  }),

  // Per-testcase timeout in ms, applied to each run, not the whole suite.
  timeoutMs: z.number().int().positive().default(5000)
});

export type ShadyConfig = z.infer<typeof ConfigSchema>;

export function configPath(cwd: string = process.cwd()): string {
  return path.join(cwd, CONFIG_FILENAME);
}

export async function configExists(cwd: string = process.cwd()): Promise<boolean> {
  return fs.pathExists(configPath(cwd));
}

export async function loadConfig(cwd: string = process.cwd()): Promise<ShadyConfig> {
  const p = configPath(cwd);
  if (!(await fs.pathExists(p))) {
    throw new Error(`No ${CONFIG_FILENAME} found in this directory. Run "sd init" first.`);
  }

  const raw = await fs.readJson(p);
  const parsed = ConfigSchema.parse(raw);

  const cliVersion = getCliVersion();
  if (parsed.version !== cliVersion) {
    logger.warn(
      `${CONFIG_FILENAME} was created with shady-cph v${parsed.version}, but you're running v${cliVersion}.`
    );
    logger.warn('Run "sd init" again to re-initialize for this version (your testcases are untouched),');
    logger.warn(`or install the matching CLI version: npm i -g shady-cph@${parsed.version}`);
  }

  return parsed;
}

export async function saveConfig(config: ShadyConfig, cwd: string = process.cwd()): Promise<void> {
  await fs.writeJson(configPath(cwd), config, { spaces: 2 });
}

export function resolveTestcaseDir(config: ShadyConfig, cwd: string = process.cwd()): string {
  return path.resolve(cwd, config.testcase.dir);
}
