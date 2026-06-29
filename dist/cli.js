#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";

// src/core/init.ts
import fs3 from "fs-extra";
import path3 from "path";
import prompts from "prompts";

// src/utils/logger.ts
import kleur from "kleur";
import ora from "ora";
var logger = {
  info: (msg) => console.log(kleur.cyan("\u2139"), msg),
  success: (msg) => console.log(kleur.green("\u2714"), msg),
  warn: (msg) => console.log(kleur.yellow("\u26A0"), msg),
  error: (msg) => console.error(kleur.red("\u2716"), msg),
  plain: (msg) => console.log(msg),
  spinner: (text) => ora({ text, color: "cyan" }).start()
};

// src/core/config.ts
import fs2 from "fs-extra";
import path2 from "path";
import { z } from "zod";

// src/core/version.ts
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
function resolvePackageJsonPath() {
  const distCandidate = path.resolve(__dirname, "..", "package.json");
  const srcCandidate = path.resolve(__dirname, "..", "..", "package.json");
  return fs.pathExistsSync(distCandidate) ? distCandidate : srcCandidate;
}
var cached = null;
function getCliVersion() {
  if (cached) return cached;
  const pkgPath = resolvePackageJsonPath();
  const pkg = fs.readJsonSync(pkgPath);
  cached = pkg.version;
  return cached;
}

// src/core/config.ts
var CONFIG_FILENAME = "shady.json";
var LanguageSchema = z.object({
  compile: z.string().optional(),
  run: z.string(),
  submissionCompiler: z.string().optional()
});
var ConfigSchema = z.object({
  // Version of shady-cph that generated this config. Checked against the
  // running CLI's own version on every command so configs don't silently
  // drift out of sync with breaking changes in the testcase/server format.
  version: z.string(),
  server: z.object({
    port: z.number().int().positive().default(42585)
  }),
  testcase: z.object({
    dir: z.string().default("./.testcase")
  }),
  // How to compile/run a solution file, keyed by extension (without the dot).
  languages: z.record(z.string(), LanguageSchema).default({
    cpp: {
      compile: "g++ -O2 -std=c++17 -o {dir}/{name} {file}",
      run: "{dir}/{name}",
      submissionCompiler: "54"
    },
    cc: {
      compile: "g++ -O2 -std=c++17 -o {dir}/{name} {file}",
      run: "{dir}/{name}",
      submissionCompiler: "89"
    },
    c: {
      compile: "gcc -O2 -std=c11 -o {dir}/{name} {file}",
      run: "{dir}/{name}",
      submissionCompiler: "43"
    },
    py: {
      run: "python3 {file}",
      submissionCompiler: "31"
    },
    js: {
      run: "node {file}",
      submissionCompiler: "55"
    },
    ts: {
      run: "npx tsx {file}"
    },
    java: {
      compile: "javac -d {dir} {file}",
      run: "java -cp {dir} {name}",
      submissionCompiler: "87"
    },
    go: {
      compile: "go build -o {dir}/{name} {file}",
      run: "{dir}/{name}",
      submissionCompiler: "32"
    },
    rs: {
      compile: "rustc -O -o {dir}/{name} {file}",
      run: "{dir}/{name}",
      submissionCompiler: "75"
    }
  }),
  // Per-testcase timeout in ms, applied to each run, not the whole suite.
  timeoutMs: z.number().int().positive().default(5e3)
});
function configPath(cwd = process.cwd()) {
  return path2.join(cwd, CONFIG_FILENAME);
}
async function configExists(cwd = process.cwd()) {
  return fs2.pathExists(configPath(cwd));
}
async function loadConfig(cwd = process.cwd()) {
  const p = configPath(cwd);
  if (!await fs2.pathExists(p)) {
    throw new Error(`No ${CONFIG_FILENAME} found in this directory. Run "sd init" first.`);
  }
  const raw = await fs2.readJson(p);
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
async function saveConfig(config, cwd = process.cwd()) {
  await fs2.writeJson(configPath(cwd), config, { spaces: 2 });
}
function resolveTestcaseDir(config, cwd = process.cwd()) {
  return path2.resolve(cwd, config.testcase.dir);
}

// src/core/init.ts
async function initCommand(opts) {
  const cwd = process.cwd();
  if (await configExists(cwd)) {
    const { overwrite } = opts.yes ? { overwrite: true } : await prompts({
      type: "confirm",
      name: "overwrite",
      message: `${CONFIG_FILENAME} already exists. Re-initialize (testcases are kept)?`,
      initial: false
    });
    if (!overwrite) {
      logger.info("Aborted.");
      return;
    }
  }
  const answers = opts.yes ? { port: 42585, testcaseDir: "./.testcase" } : await prompts([
    { type: "number", name: "port", message: "Server port (for the browser extension)", initial: 42585 },
    { type: "text", name: "testcaseDir", message: "Testcase directory", initial: "./.testcase" }
  ]);
  if (!answers.testcaseDir) {
    logger.warn("Aborted.");
    return;
  }
  const config = ConfigSchema.parse({
    version: getCliVersion(),
    server: { port: answers.port },
    testcase: { dir: answers.testcaseDir }
  });
  await fs3.ensureDir(path3.resolve(cwd, answers.testcaseDir));
  await saveConfig(config, cwd);
  logger.success(`Created ${CONFIG_FILENAME}`);
  logger.success(`Created testcase directory at ${answers.testcaseDir}`);
  logger.plain("");
  logger.info(`Next: run "sd run" and point your browser extension at port ${config.server.port}.`);
  logger.info(`Config saved to ${configPath(cwd)}`);
}

// src/commands/run.ts
import fs4 from "fs-extra";
import { spawn } from "child_process";

// src/core/daemonPaths.ts
import os from "os";
import path4 from "path";
function getDaemonPaths() {
  const shadyDir = path4.join(os.homedir(), ".shady");
  return {
    dir: shadyDir,
    pid: path4.join(shadyDir, "server.pid"),
    json: path4.join(shadyDir, "server.json"),
    log: path4.join(shadyDir, "server.log")
  };
}

// src/commands/run.ts
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}
async function runCommand(opts) {
  const config = await loadConfig();
  const port = opts.port ?? config.server.port;
  const paths = getDaemonPaths();
  if (await fs4.pathExists(paths.pid)) {
    try {
      const pidStr = await fs4.readFile(paths.pid, "utf-8");
      const pid2 = parseInt(pidStr.trim(), 10);
      if (!isNaN(pid2) && isProcessRunning(pid2)) {
        logger.error(`Server is already running with PID ${pid2}.`);
        process.exit(1);
      }
    } catch (err) {
    }
  }
  await fs4.ensureDir(paths.dir);
  const logStream = fs4.openSync(paths.log, "a");
  const args = [process.argv[1], "daemon"];
  if (opts.port) {
    args.push("--port", String(opts.port));
  }
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: ["ignore", logStream, logStream],
    cwd: process.cwd()
  });
  const pid = child.pid;
  if (!pid) {
    logger.error("Failed to spawn daemon process.");
    process.exit(1);
  }
  await fs4.writeFile(paths.pid, String(pid), "utf-8");
  const serverJson = {
    pid,
    port,
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    cwd: process.cwd()
  };
  await fs4.writeJson(paths.json, serverJson, { spaces: 2 });
  child.unref();
  logger.success(`Server started in background (PID: ${pid}, Port: ${port}).`);
}

// src/commands/test.ts
import path7 from "path";
import fg from "fast-glob";
import fs7 from "fs-extra";

// src/core/testcase.ts
import fs5 from "fs-extra";
import path5 from "path";
var CASE_DELIMITER = "@@@ CASE @@@";
function sanitizeSegment(segment) {
  return segment.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}
function testcaseFileName(problemNumber, platform) {
  return `${sanitizeSegment(problemNumber)}.${sanitizeSegment(platform)}.test`;
}
function testcaseFilePath(testcaseDir, problemNumber, platform) {
  return path5.join(testcaseDir, testcaseFileName(problemNumber, platform));
}
function serializeTestCases(cases) {
  return cases.map((c) => `INPUT
${c.input.replace(/\s+$/, "")}
OUTPUT
${c.output.replace(/\s+$/, "")}`).join(`
${CASE_DELIMITER}
`) + "\n";
}
function parseTestCases(content) {
  const blocks = content.replace(/\r\n/g, "\n").trim().split(new RegExp(`\\n?${escapeRegExp(CASE_DELIMITER)}\\n?`));
  return blocks.map((block) => block.trim()).filter(Boolean).map((block) => {
    const lines = block.split("\n");
    const inputIdx = lines.indexOf("INPUT");
    const outputIdx = lines.indexOf("OUTPUT");
    if (inputIdx === -1 || outputIdx === -1 || outputIdx < inputIdx) {
      throw new Error("Malformed testcase block: expected an INPUT section followed by an OUTPUT section.");
    }
    const input = lines.slice(inputIdx + 1, outputIdx).join("\n");
    const output = lines.slice(outputIdx + 1).join("\n");
    return { input, output };
  });
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function writeTestCase(filePath, testcase) {
  await fs5.ensureDir(path5.dirname(filePath));
  await fs5.writeFile(filePath, serializeTestCases([testcase]), "utf-8");
  return { totalCases: 1 };
}
async function readTestCases(filePath) {
  const content = await fs5.readFile(filePath, "utf-8");
  return parseTestCases(content);
}
async function writeRunLatest(testcaseDir, fileName) {
  await fs5.writeFile(path5.join(testcaseDir, ".run-latest"), fileName, "utf-8");
}
async function readRunLatest(testcaseDir) {
  const p = path5.join(testcaseDir, ".run-latest");
  if (!await fs5.pathExists(p)) return null;
  return (await fs5.readFile(p, "utf-8")).trim() || null;
}

// src/core/diff.ts
import kleur2 from "kleur";
function diffOutputs(expected, actual) {
  const expLines = normalize(expected);
  const actLines = normalize(actual);
  const max = Math.max(expLines.length, actLines.length);
  const rendered = [];
  let matched = true;
  for (let i = 0; i < max; i++) {
    const e = expLines[i];
    const a = actLines[i];
    if (e === a) {
      if (e !== void 0) rendered.push(kleur2.dim(`  ${e}`));
      continue;
    }
    matched = false;
    if (e !== void 0) rendered.push(kleur2.red(`- ${e}`));
    if (a !== void 0) rendered.push(kleur2.green(`+ ${a}`));
  }
  return { matched, rendered };
}
function normalize(s) {
  return s.replace(/\r\n/g, "\n").split("\n").map((l) => l.replace(/\s+$/, "")).filter((_, idx, arr) => !(idx === arr.length - 1 && arr[idx] === "" && arr.length > 1));
}

// src/core/runner.ts
import { spawn as spawn2 } from "child_process";
import path6 from "path";
import fs6 from "fs-extra";
import os2 from "os";
function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}
function execShell(command, input, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn2(command, { shell: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout?.on("data", (d) => stdout += d.toString());
    child.stderr?.on("data", (d) => stderr += d.toString());
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: null, timedOut, spawnError: err.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code, timedOut });
    });
    child.stdin?.write(input);
    child.stdin?.end();
  });
}
async function prepareSolutionRunner(config, solutionFile) {
  const ext = path6.extname(solutionFile).replace(".", "");
  const lang = config.languages[ext];
  if (!lang) {
    return {
      run: async () => ({
        stdout: "",
        stderr: "",
        exitCode: null,
        timedOut: false,
        spawnError: `No language config for ".${ext}" files. Add one under "languages" in shady.json.`
      })
    };
  }
  const buildDir = path6.join(os2.tmpdir(), "shady-cph-build");
  await fs6.ensureDir(buildDir);
  const name = path6.basename(solutionFile, path6.extname(solutionFile));
  const vars = { file: solutionFile, dir: buildDir, name };
  if (lang.compile) {
    const compileCmd = fillTemplate(lang.compile, vars);
    const result = await execShell(compileCmd, "", config.timeoutMs);
    if (result.exitCode !== 0 || result.spawnError) {
      return {
        run: async () => result,
        spawnError: result.spawnError ?? `Compilation failed (exit ${result.exitCode}):
${result.stderr}`
      };
    }
  }
  const runCmd = fillTemplate(lang.run, vars);
  return {
    run: (input) => execShell(runCmd, input, config.timeoutMs)
  };
}

// src/commands/test.ts
async function resolveTestcaseFile(testcaseDir, opts) {
  if (opts.problem) {
    const pattern = opts.platform ? `${opts.problem}.${opts.platform}.test` : `${opts.problem}.*.test`;
    const matches = await fg(pattern, { cwd: testcaseDir, absolute: true });
    if (matches.length === 0) {
      throw new Error(`No saved testcase matching "${pattern}" in ${testcaseDir}`);
    }
    if (matches.length > 1) {
      throw new Error(
        `Multiple platforms found for problem "${opts.problem}": ${matches.map((m) => path7.basename(m)).join(", ")}. Disambiguate with --platform.`
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
  return path7.join(testcaseDir, latest);
}
async function testCommand(solutionFile, opts) {
  const config = await loadConfig();
  const testcaseDir = resolveTestcaseDir(config);
  const resolvedSolution = path7.resolve(process.cwd(), solutionFile);
  if (!await fs7.pathExists(resolvedSolution)) {
    logger.error(`Solution file not found: ${resolvedSolution}`);
    process.exitCode = 1;
    return;
  }
  let testcaseFile;
  try {
    testcaseFile = await resolveTestcaseFile(testcaseDir, opts);
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }
  const cases = await readTestCases(testcaseFile);
  logger.info(`Running ${path7.basename(solutionFile)} against ${path7.basename(testcaseFile)} (${cases.length} case(s))`);
  logger.plain("");
  const { run, spawnError } = await prepareSolutionRunner(config, resolvedSolution);
  if (spawnError) {
    logger.error("Spawn/compile error:");
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
    const { matched } = diffOutputs(tc.output, result.stdout);
    if (matched) {
      passed++;
    }
    const formattedInput = opts.number ? tc.input.replace(/\r\n/g, "\n").split("\n").map((line, idx) => `${idx + 1}. ${line}`).join("\n") : tc.input;
    logger.plain(kleur.bold(`Test case ${i + 1}/${cases.length} ${matched ? kleur.green("PASSED") : kleur.red("FAILED")}`));
    logger.plain(kleur.dim("input:"));
    logger.plain(indent(formattedInput));
    if (result.spawnError) {
      logger.error(`Spawn error: ${result.spawnError}`);
      logger.plain("");
      continue;
    }
    if (result.timedOut) {
      logger.error(`Timed out after ${config.timeoutMs}ms`);
      logger.plain("");
      continue;
    }
    const expLines = normalize(tc.output);
    const actLines = normalize(result.stdout);
    const expectedLinesToPrint = [];
    for (let j = 0; j < expLines.length; j++) {
      const e = expLines[j];
      const a = actLines[j];
      let lineText = e;
      if (e !== a) {
        lineText = kleur.red(`- ${e}`);
      }
      if (opts.number) {
        expectedLinesToPrint.push(`${j + 1}. ${lineText}`);
      } else {
        expectedLinesToPrint.push(lineText);
      }
    }
    const formattedOutput = opts.number ? result.stdout.replace(/\r\n/g, "\n").split("\n").map((line, idx) => `${idx + 1}. ${line}`).join("\n") : result.stdout;
    logger.plain(kleur.dim("expected:"));
    logger.plain(indent(expectedLinesToPrint.join("\n")));
    logger.plain(kleur.dim("your output:"));
    logger.plain(indent(formattedOutput));
    if (result.exitCode !== 0) {
      logger.warn(`Process exited with code ${result.exitCode}`);
    }
    if (result.stderr.trim()) {
      logger.plain(kleur.dim("stderr:"));
      logger.plain(indent(kleur.yellow(result.stderr.trim())));
    }
    logger.plain("");
  }
  const summaryColor = passed === cases.length ? kleur.green : kleur.red;
  logger.plain(kleur.bold(summaryColor(`${passed}/${cases.length} test case(s) passed`)));
  process.exitCode = passed === cases.length ? 0 : 1;
}
function indent(text) {
  return text.split("\n").map((l) => `  ${l}`).join("\n");
}

// src/commands/view.ts
import fs8 from "fs-extra";
import path8 from "path";
import fg2 from "fast-glob";
async function viewCommand(opts) {
  const config = await loadConfig();
  const testcaseDir = resolveTestcaseDir(config);
  if (!await fs8.pathExists(testcaseDir)) {
    logger.error(`Testcase directory does not exist: ${testcaseDir}`);
    process.exitCode = 1;
    return;
  }
  let testcaseFiles = [];
  if (opts.all) {
    testcaseFiles = await fg2("*.test", { cwd: testcaseDir, absolute: true });
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
    const targetFile = path8.join(testcaseDir, latest);
    if (!await fs8.pathExists(targetFile)) {
      logger.error(`Latest testcase file not found: ${latest}`);
      process.exitCode = 1;
      return;
    }
    testcaseFiles = [targetFile];
  }
  for (let i = 0; i < testcaseFiles.length; i++) {
    const file = testcaseFiles[i];
    const fileName = path8.basename(file);
    const relativePath = path8.relative(process.cwd(), file);
    logger.plain(kleur.bold().cyan(`\u250C\u2500\u2500 ${fileName} (${relativePath})`));
    try {
      const content = await fs8.readFile(file, "utf-8");
      const lines = content.split("\n");
      if (lines.length > 0 && lines[lines.length - 1] === "") {
        lines.pop();
      }
      for (const line of lines) {
        if (line === "INPUT") {
          logger.plain(kleur.bold().blue("\u2502 INPUT"));
        } else if (line === "OUTPUT") {
          logger.plain(kleur.bold().green("\u2502 OUTPUT"));
        } else if (line.trim() === "@@@ CASE @@@") {
          logger.plain(kleur.yellow("\u251C\u2500 @@@ CASE @@@"));
        } else {
          logger.plain(`\u2502 ${kleur.dim(line)}`);
        }
      }
    } catch (err) {
      logger.error(`Failed to read ${fileName}: ${err instanceof Error ? err.message : String(err)}`);
    }
    logger.plain(kleur.bold().cyan("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
    if (i < testcaseFiles.length - 1) {
      logger.plain("");
    }
  }
}

// src/core/daemon.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { z as z3 } from "zod";
import fs9 from "fs-extra";

// ../shared-schemas/dist/index.js
import { z as z2 } from "zod";
var PayloadSchema = z2.object({
  parser: z2.object({
    version: z2.union([z2.string(), z2.number()]),
    name: z2.string()
  }).optional(),
  platform: z2.string(),
  problem_number: z2.string().optional(),
  contest_number: z2.union([z2.string(), z2.number()]).optional(),
  contestId: z2.union([z2.string(), z2.number()]).optional(),
  question_label: z2.string().optional(),
  problemIndex: z2.string().optional(),
  label: z2.string().optional(),
  question_url: z2.string().optional(),
  testcase: z2.object({
    input: z2.string(),
    output: z2.string()
  })
});
var SubmissionSchema = z2.object({
  sourceCode: z2.string(),
  filename: z2.string(),
  // Optional language code override (e.g., "54" for G++17)
  programTypeId: z2.string().optional(),
  language: z2.string()
});

// src/core/daemon.ts
var SubmissionSchema2 = z3.object({
  sourceCode: z3.string(),
  filename: z3.string(),
  programTypeId: z3.string().optional(),
  language: z3.string()
});
var BodySchema = {
  type: "object",
  required: ["platform", "testcase"],
  properties: {
    parser: {
      type: "object",
      properties: {
        version: { anyOf: [{ type: "string" }, { type: "number" }] },
        name: { type: "string" }
      }
    },
    platform: { type: "string" },
    problem_number: { type: "string" },
    contest_number: { anyOf: [{ type: "string" }, { type: "number" }] },
    contestId: { anyOf: [{ type: "string" }, { type: "number" }] },
    question_label: { type: "string" },
    problemIndex: { type: "string" },
    label: { type: "string" },
    question_url: { type: "string" },
    testcase: {
      type: "object",
      required: ["input", "output"],
      properties: {
        input: { type: "string" },
        output: { type: "string" }
      }
    }
  }
};
function parseProblemFromUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes("codeforces.com")) {
      const match1 = url.pathname.match(/\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/);
      if (match1) return { contest: match1[1], problem: match1[2] };
      const match2 = url.pathname.match(/\/problem\/(\d+)\/([A-Za-z0-9]+)/);
      if (match2) return { contest: match2[1], problem: match2[2] };
    } else if (url.hostname.includes("atcoder.jp")) {
      const match = url.pathname.match(/\/contests\/([^/]+)\/tasks\/([^/]+)/);
      if (match) {
        const contest = match[1];
        const task = match[2];
        const problem = task.startsWith(contest + "_") ? task.slice(contest.length + 1) : task;
        return { contest, problem };
      }
    }
  } catch (e) {
  }
  return null;
}
async function runDaemon(opts) {
  const config = await loadConfig();
  const port = opts.port ?? config.server.port;
  const testcaseDir = resolveTestcaseDir(config);
  const app = Fastify({ logger: false });
  let inactivityTimeout = null;
  const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1e3;
  const resetInactivityTimer = () => {
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout);
    }
    inactivityTimeout = setTimeout(async () => {
      console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] No requests received for 30 minutes. Automatically shutting down...`);
      try {
        await app.close();
      } catch (e) {
      }
      cleanup();
      process.exit(0);
    }, INACTIVITY_LIMIT_MS);
  };
  resetInactivityTimer();
  app.addHook("onRequest", async (request, reply) => {
    if (request.url !== "/health") {
      resetInactivityTimer();
    }
  });
  await app.register(cors, {
    origin: true,
    methods: ["POST"]
  });
  app.get("/health", async (request, reply) => {
    return { status: "ok" };
  });
  app.post(
    "/",
    {
      schema: {
        body: BodySchema
      }
    },
    async (request, reply) => {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      try {
        const payload = PayloadSchema.parse(request.body);
        let problemLabel = payload.label;
        const problemNumber = payload.problem_number ?? payload.problemIndex;
        const contestNumber = payload.contest_number ?? payload.contestId;
        if (!problemLabel) {
          if (problemNumber !== void 0 && contestNumber !== void 0) {
            problemLabel = `${contestNumber}${problemNumber}`;
          }
        }
        if (!problemLabel && payload.question_url) {
          const parsed = parseProblemFromUrl(payload.question_url);
          if (parsed && parsed.contest && parsed.problem) {
            problemLabel = `${parsed.contest}${parsed.problem}`;
          }
        }
        if (!problemLabel) {
          return reply.status(400).send({
            ok: false,
            error: "Missing problem identification (need problem_number or contest_number + question_label)"
          });
        }
        console.log(`[${timestamp}] Processing incoming testcase for ${problemLabel} (${payload.platform})...`);
        const filePath = testcaseFilePath(
          testcaseDir,
          problemLabel,
          payload.platform
        );
        const { totalCases } = await writeTestCase(filePath, payload.testcase);
        await writeRunLatest(
          testcaseDir,
          testcaseFileName(problemLabel, payload.platform)
        );
        console.log(
          `[${(/* @__PURE__ */ new Date()).toISOString()}] Saved testcase for ${problemLabel} (${payload.platform}) \u2014 ${totalCases} case(s) total`
        );
        return reply.send({
          ok: true,
          file: testcaseFileName(problemLabel, payload.platform),
          totalCases
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] Rejected incoming testcase: ${message}`);
        return reply.status(400).send({
          ok: false,
          error: message
        });
      }
    }
  );
  await app.register(websocketPlugin);
  let connectedSockets = [];
  app.get("/stream", { websocket: true }, (socket, req) => {
    if (!socket) {
      console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] Empty WebSocket socket.`);
      return;
    }
    connectedSockets.push(socket);
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] Browser extension established a live socket stream.`);
    resetInactivityTimer();
    socket.on("close", (code, reason) => {
      connectedSockets = connectedSockets.filter((s) => s !== socket);
    });
    socket.on("error", (err) => {
      console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] Socket error:`, err);
    });
    socket.on("message", (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === "PING") {
          socket.send(JSON.stringify({ type: "PONG" }));
        } else {
          resetInactivityTimer();
        }
      } catch (e) {
        resetInactivityTimer();
      }
    });
  });
  app.post("/submit", async (request, reply) => {
    try {
      const submission = SubmissionSchema2.parse(request.body);
      connectedSockets.forEach((s, idx) => {
        console.log(`  -> Socket [${idx}] readyState: ${s?.readyState}`);
      });
      connectedSockets = connectedSockets.filter((socket) => socket && socket.readyState === 1);
      if (connectedSockets.length === 0) {
        return reply.status(503).send({
          ok: false,
          error: "No active browser tab is connected",
          debugInfo: "Check server console. connectedSockets array evaluated to empty."
        });
      }
      const payload = JSON.stringify({ type: "SHADY_SUBMIT", data: submission });
      connectedSockets.forEach((socket) => {
        try {
          socket.send(payload);
        } catch (e) {
          console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] Error sending payload to socket:`, e);
        }
      });
      return reply.send({ ok: true, status: "relayed_to_browser" });
    } catch (err) {
      return reply.status(400).send({ ok: false, error: err.message });
    }
  });
  const paths = getDaemonPaths();
  const cleanup = () => {
    try {
      if (fs9.existsSync(paths.pid)) {
        const pidStr = fs9.readFileSync(paths.pid, "utf-8");
        if (parseInt(pidStr.trim(), 10) === process.pid) {
          fs9.unlinkSync(paths.pid);
        }
      }
    } catch (e) {
    }
    try {
      if (fs9.existsSync(paths.json)) {
        const data = fs9.readJsonSync(paths.json);
        if (data.pid === process.pid) {
          fs9.unlinkSync(paths.json);
        }
      }
    } catch (e) {
    }
  };
  process.on("exit", cleanup);
  const shutdown = async (signal) => {
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] Received ${signal}. Shutting down server...`);
    try {
      await app.close();
    } catch (e) {
    }
    cleanup();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  try {
    await app.listen({
      port,
      host: "127.0.0.1"
    });
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] shady-cph server listening on http://localhost:${port}`);
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] Watching for testcases -> ${testcaseDir}`);
  } catch (err) {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[${(/* @__PURE__ */ new Date()).toISOString()}] Port ${port} is already in use. Is "sd run" already running?`
      );
    } else {
      console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${err.message}`);
    }
    cleanup();
    process.exit(1);
  }
}

// src/commands/status.ts
import fs10 from "fs-extra";
import http from "http";
function checkHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 2e3 }, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on("error", () => {
      resolve(false);
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}
async function statusCommand() {
  const paths = getDaemonPaths();
  if (!await fs10.pathExists(paths.json)) {
    logger.info("Server is not running.");
    return;
  }
  let serverData;
  try {
    serverData = await fs10.readJson(paths.json);
  } catch (err) {
    logger.error("Failed to read server.json configuration.");
    return;
  }
  const { pid, port, startedAt } = serverData;
  if (typeof pid !== "number" || !isProcessRunning(pid)) {
    logger.warn("Server is not running (found stale server.json).");
    return;
  }
  const healthy = await checkHealth(port);
  if (healthy) {
    logger.success(`Server is running (PID: ${pid}, Port: ${port}, Started: ${startedAt}).`);
  } else {
    logger.error(`Server is not responding (PID: ${pid} is active but /health failed).`);
  }
}

// src/commands/stop.ts
import fs11 from "fs-extra";
async function stopCommand() {
  const paths = getDaemonPaths();
  if (!await fs11.pathExists(paths.pid)) {
    logger.info("Server is not running.");
    if (await fs11.pathExists(paths.json)) {
      await fs11.remove(paths.json).catch(() => {
      });
    }
    return;
  }
  let pid;
  try {
    const pidStr = await fs11.readFile(paths.pid, "utf-8");
    pid = parseInt(pidStr.trim(), 10);
  } catch (err) {
    logger.error("Failed to read server.pid.");
    return;
  }
  if (isNaN(pid) || !isProcessRunning(pid)) {
    logger.warn("Server is not running, but stale files were found. Cleaning up...");
    await fs11.remove(paths.pid).catch(() => {
    });
    await fs11.remove(paths.json).catch(() => {
    });
    return;
  }
  logger.info(`Stopping server (PID: ${pid})...`);
  try {
    process.kill(pid, "SIGTERM");
  } catch (err) {
    logger.error(`Failed to send SIGTERM to process ${pid}: ${err.message}`);
    return;
  }
  let exited = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (!isProcessRunning(pid)) {
      exited = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!exited) {
    logger.warn("Server did not stop within 5 seconds. Sending SIGKILL...");
    try {
      process.kill(pid, "SIGKILL");
      for (let attempt = 0; attempt < 20; attempt++) {
        if (!isProcessRunning(pid)) {
          exited = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err) {
      logger.error(`Failed to send SIGKILL: ${err.message}`);
    }
  }
  await fs11.remove(paths.pid).catch(() => {
  });
  await fs11.remove(paths.json).catch(() => {
  });
  if (exited) {
    logger.success("Server stopped.");
  } else {
    logger.error("Failed to stop the server.");
  }
}

// src/commands/logs.ts
import fs12 from "fs-extra";
async function logsCommand() {
  const paths = getDaemonPaths();
  if (!await fs12.pathExists(paths.log)) {
    console.log(`No log file found at ${paths.log}. Is the server running?`);
    return;
  }
  const initialContent = await fs12.readFile(paths.log, "utf-8");
  process.stdout.write(initialContent);
  let position = (await fs12.stat(paths.log)).size;
  const fd = await fs12.open(paths.log, "r");
  const watcher = fs12.watch(paths.log, async (event) => {
    if (event === "change") {
      try {
        const stats = await fs12.stat(paths.log);
        if (stats.size > position) {
          const length = stats.size - position;
          const buffer = Buffer.alloc(length);
          await fs12.read(fd, buffer, 0, length, position);
          process.stdout.write(buffer.toString("utf-8"));
          position = stats.size;
        } else if (stats.size < position) {
          position = stats.size;
        }
      } catch (err) {
      }
    }
  });
  process.on("SIGINT", () => {
    watcher.close();
    fs12.close(fd).catch(() => {
    });
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    watcher.close();
    fs12.close(fd).catch(() => {
    });
    process.exit(0);
  });
}

// src/commands/clean.ts
import fs13 from "fs-extra";
async function cleanCommand() {
  logger.info("Stopping server before cleaning...");
  await stopCommand();
  const config = await loadConfig();
  const testcaseDir = resolveTestcaseDir(config);
  if (await fs13.pathExists(testcaseDir)) {
    await fs13.emptyDir(testcaseDir);
    logger.success(`Cleaned all testcase files from ${testcaseDir}.`);
  } else {
    logger.info(`Testcase directory ${testcaseDir} does not exist.`);
  }
}

// src/commands/submit.ts
import fs14 from "fs-extra";
import path9 from "path";
import http2 from "http";
function postSubmission(port, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http2.request({
      hostname: "127.0.0.1",
      port,
      path: "/submit",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      },
      timeout: 5e3
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
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
    req.on("error", (e) => reject(e));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.write(postData);
    req.end();
  });
}
async function submitCommand(solutionFile, opts) {
  const config = await loadConfig();
  const testcaseDir = resolveTestcaseDir(config);
  const resolvedSolution = path9.resolve(process.cwd(), solutionFile);
  if (!await fs14.pathExists(resolvedSolution)) {
    logger.error(`Solution file not found: ${resolvedSolution}`);
    process.exitCode = 1;
    return;
  }
  const ext = path9.extname(resolvedSolution).replace(".", "");
  const langConfig = config.languages[ext];
  const programTypeId = opts.compiler ?? langConfig?.submissionCompiler;
  let problemNumber;
  try {
    const latest = await readRunLatest(testcaseDir);
    if (!latest) {
      logger.error('No latest run problem found in .run-latest. Run "sd test" or receive a testcase first.');
      process.exitCode = 1;
      return;
    }
    const parts = latest.split(".");
    problemNumber = parts[0];
  } catch (err) {
    logger.error(`Failed to read latest run problem: ${err.message}`);
    process.exitCode = 1;
    return;
  }
  const filename = `${problemNumber}.${ext}`;
  const sourceCode = await fs14.readFile(resolvedSolution, "utf-8");
  const paths = getDaemonPaths();
  if (!await fs14.pathExists(paths.json)) {
    logger.error('Server is not running. Start the server first with "sd run".');
    process.exitCode = 1;
    return;
  }
  let serverData;
  try {
    serverData = await fs14.readJson(paths.json);
  } catch (err) {
    logger.error("Failed to read server status.");
    process.exitCode = 1;
    return;
  }
  const port = serverData.port;
  logger.info(`Submitting ${path9.basename(resolvedSolution)} for question ${problemNumber}...`);
  try {
    const result = await postSubmission(port, {
      sourceCode,
      filename,
      programTypeId,
      language: ext
    });
    if (result.ok) {
      logger.success("Submission request sended successfully!\nNote: Your codeforces Contest Question should be open in the background to make it work");
    } else {
      logger.error(`Submission failed: ${result.error}`);
      process.exitCode = 1;
    }
  } catch (err) {
    logger.error(`Failed to submit code via shady: ${err.message}`);
    process.exitCode = 1;
  }
}

// src/cli.ts
var program = new Command();
program.name("sd").description("shady-cph: a competitive-programming runner that receives testcases from other cp platform via on specific port (defined in shady.json) or via our browser extension (shady-cph-parser)").version(getCliVersion());
program.command("init").description("Initialize shady.json and the testcase directory in the current folder").option("-y, --yes", "Skip prompts and use defaults", false).action(async (opts) => {
  await initCommand(opts);
});
program.command("run").description("Start the local server in the background to listen for testcases").option("-p, --port <port>", "Override the port from shady.json", (v) => parseInt(v, 10)).action(async (opts) => {
  await runCommand(opts);
});
program.command("daemon", { hidden: true }).description("Internal background server daemon process").option("-p, --port <port>", "Override the port from shady.json", (v) => parseInt(v, 10)).action(async (opts) => {
  await runDaemon(opts);
});
program.command("status").description("Check the status of the background server").action(async () => {
  await statusCommand();
});
program.command("stop").description("Stop the running background server").action(async () => {
  await stopCommand();
});
program.command("logs").description("View and tail the background server logs").action(async () => {
  await logsCommand();
});
program.command("clean").description("Stop server and clean all testcase files").action(async () => {
  await cleanCommand();
});
program.command("submit").argument("<solution>", "Path to your solution file (e.g. ./solutions/1230A.cpp)").option("-c, --compiler <compiler_id>", 'Optional compiler/programTypeID override (e.g. "54" for G++17)').description("Submit your solution code to the browser extension").action(async (solution, opts) => {
  await submitCommand(solution, opts);
});
program.command("test").argument("<solution>", "Path to your solution file (e.g. ./solutions/1230A.cpp)").option("--problem <number>", "Run against a specific saved problem number instead of the latest received testcase").option("--platform <platform>", "Disambiguate platform when --problem matches multiple files").option("-n, --number", "Prefix output lines with sequence numbers", false).description("Run a solution against saved testcases and diff the output").action(async (solution, opts) => {
  await testCommand(solution, opts);
});
program.command("view").option("-a, --all", "Print all saved testcases", false).description("Print the latest testcase, or all saved testcases with their contents").action(async (opts) => {
  await viewCommand(opts);
});
program.parseAsync(process.argv).catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
