import kleur from 'kleur';

export interface LineDiffResult {
  matched: boolean;
  rendered: string[]; // lines, pre-colored, ready to print
}

/**
 * Compares expected vs actual output line-by-line (trailing whitespace per
 * line is ignored, as is a trailing blank line at EOF - both are common
 * sources of false negatives for competitive judges).
 */
export function diffOutputs(expected: string, actual: string): LineDiffResult {
  const expLines = normalize(expected);
  const actLines = normalize(actual);

  const max = Math.max(expLines.length, actLines.length);
  const rendered: string[] = [];
  let matched = true;

  for (let i = 0; i < max; i++) {
    const e = expLines[i];
    const a = actLines[i];

    if (e === a) {
      if (e !== undefined) rendered.push(kleur.dim(`  ${e}`));
      continue;
    }

    matched = false;
    if (e !== undefined) rendered.push(kleur.red(`- ${e}`));
    if (a !== undefined) rendered.push(kleur.green(`+ ${a}`));
  }

  return { matched, rendered };
}

export function normalize(s: string): string[] {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((_, idx, arr) => !(idx === arr.length - 1 && arr[idx] === '' && arr.length > 1));
}
