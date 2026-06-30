import { execFileSync } from "node:child_process";
import { logger } from './logger.js';

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export function git(args: string[], cwd = process.cwd(), silent: boolean = false) {
  try {
    const stdout = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return stdout.trim();
  } catch (error) {
    if (!silent) logger.error(`Git command failed: git ${args.join(" ")}`);
    throw error;
  }
}

export function isGitClean(): boolean {
  const stdout = git(['status', '--porcelain']);
  return stdout.length === 0;
}

export function getCurrentBranch(): string {
  const { stdout } = git(['branch', '--show-current']);
  return stdout;
}
