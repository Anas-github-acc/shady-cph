import fs from 'fs-extra';
import path from 'node:path';

export interface RawTestCase {
  input: string;
  output: string;
}

// Multiple sample testcases for the same problem can arrive as separate
// POSTs from the extension; they're appended into one file, separated by
// this delimiter line. Kept distinct from "INPUT"/"OUTPUT" so it can't
// collide with normal testcase content.
const CASE_DELIMITER = '@@@ CASE @@@';
const HEADER_NOTE = `Note: to add more testcases add a line \`${CASE_DELIMITER}\` between testcases to separate them`;

export function sanitizeSegment(segment: string): string {
  return segment.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function testcaseFileName(problemNumber: string, platform: string): string {
  return `${sanitizeSegment(problemNumber)}.${sanitizeSegment(platform)}.test`;
}

export function testcaseFilePath(testcaseDir: string, problemNumber: string, platform: string): string {
  return path.join(testcaseDir, testcaseFileName(problemNumber, platform));
}

export function serializeTestCases(cases: RawTestCase[]): string {
  return (
    cases
      .map((c) => `INPUT\n${c.input.replace(/\s+$/, '')}\nOUTPUT\n${c.output.replace(/\s+$/, '')}`)
      .join(`\n${CASE_DELIMITER}\n`) + '\n'
  );
}

export function parseTestCases(content: string): RawTestCase[] {
  const blocks = content.replace(/\r\n/g, '\n').trim().split(new RegExp(`\\n?${escapeRegExp(CASE_DELIMITER)}\\n?`));

  return blocks
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      const inputIdx = lines.indexOf('INPUT');
      const outputIdx = lines.indexOf('OUTPUT');
      if (inputIdx === -1 || outputIdx === -1 || outputIdx < inputIdx) {
        throw new Error('Malformed testcase block: expected an INPUT section followed by an OUTPUT section.');
      }
      const input = lines.slice(inputIdx + 1, outputIdx).join('\n');
      const output = lines.slice(outputIdx + 1).join('\n');
      return { input, output };
    });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Appends a new testcase to an existing .test file (or creates it).
 * Skips the append if an identical input/output pair already exists,
 * since the extension may resend the same sample more than once.
 */
export async function appendTestCase(filePath: string, testcase: RawTestCase): Promise<{ totalCases: number }> {
  let existing: RawTestCase[] = [];
  if (await fs.pathExists(filePath)) {
    const content = await fs.readFile(filePath, 'utf-8');
    existing = parseTestCases(content);
  }

  const alreadyPresent = existing.some(
    (c) => c.input === testcase.input && c.output === testcase.output
  );

  const allCases = alreadyPresent ? existing : [...existing, testcase];
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, serializeTestCases(allCases), 'utf-8');

  return { totalCases: allCases.length };
}

export async function writeTestCase(filePath: string, testcase: RawTestCase): Promise<{ totalCases: number }> {
  await fs.ensureDir(path.dirname(filePath));
  const content = `${HEADER_NOTE}\n\n${serializeTestCases([testcase])}`;
  await fs.writeFile(filePath, content, 'utf-8');
  return { totalCases: 1 };
}


export async function readTestCases(filePath: string): Promise<RawTestCase[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  if (lines[0].startsWith("Note:")) {
    lines.shift();

    while (lines.length > 0 && lines[0].trim() === "") {
      lines.shift();
    }
  }
  return parseTestCases(lines.join("\n"));
}

export async function writeRunLatest(testcaseDir: string, fileName: string): Promise<void> {
  await fs.writeFile(path.join(testcaseDir, '.run-latest'), fileName, 'utf-8');
}

export async function readRunLatest(testcaseDir: string): Promise<string | null> {
  const p = path.join(testcaseDir, '.run-latest');
  if (!(await fs.pathExists(p))) return null;
  return (await fs.readFile(p, 'utf-8')).trim() || null;
}
