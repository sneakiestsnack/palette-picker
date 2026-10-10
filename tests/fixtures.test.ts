// Verifies every fixture listed in fixtures/SHA256SUMS.txt (blueprint §6).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const fixturesDir = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'fixtures');

const entries = readFileSync(join(fixturesDir, 'SHA256SUMS.txt'), 'utf8')
  .split(/\r?\n/)
  .filter((line) => line.trim() !== '')
  .map((line) => {
    const m = /^([0-9a-fA-F]{64}) [ *](.+)$/.exec(line);
    if (!m) throw new Error(`bad SHA256SUMS line: ${line}`);
    return { hash: m[1]!.toLowerCase(), path: m[2]! };
  });

describe('fixtures', () => {
  it('lists fixtures', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)('$path matches its SHA-256', ({ hash, path }) => {
    const actual = createHash('sha256').update(readFileSync(join(fixturesDir, path))).digest('hex');
    expect(actual).toBe(hash);
  });
});
