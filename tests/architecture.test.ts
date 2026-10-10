// Architecture rules (blueprint §3.2). Scans source files as text.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const coreDir = join(root, 'src', 'core');

function listFiles(dir: string, exts: RegExp): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, exts));
    else if (exts.test(entry.name)) out.push(full);
  }
  return out;
}

const isTest = (f: string) => /\.test\.tsx?$/.test(f);
const rel = (f: string) => relative(root, f).split(sep).join('/');

// Every module specifier: `import … from 'x'`, `export … from 'x'`, `import 'x'`, `import('x')`.
function importSpecs(source: string): string[] {
  const specs: string[] = [];
  const patterns = [
    /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) for (const m of source.matchAll(re)) specs.push(m[1]!);
  return specs;
}

const coreFiles = listFiles(coreDir, /\.ts$/).filter((f) => !isTest(f));

describe('core purity', () => {
  it('finds core files to check', () => {
    expect(coreFiles.length).toBeGreaterThan(0);
  });

  it('core imports only relative modules inside src/core', () => {
    const violations: string[] = [];
    for (const file of coreFiles) {
      for (const spec of importSpecs(readFileSync(file, 'utf8'))) {
        const target = resolve(dirname(file), spec);
        const inside = target === coreDir || target.startsWith(coreDir + sep);
        if (!(spec.startsWith('./') || spec.startsWith('../')) || !inside) violations.push(`${rel(file)}: '${spec}'`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('core has no nondeterminism or asynchrony', () => {
    const banned = ['Math.random', 'Date.now', 'new Date', 'performance.now', 'async ', 'Promise'];
    const violations: string[] = [];
    for (const file of coreFiles) {
      const text = readFileSync(file, 'utf8');
      for (const b of banned) if (text.includes(b)) violations.push(`${rel(file)}: ${b}`);
    }
    expect(violations).toEqual([]);
  });
});

describe('layering', () => {
  it('ui/ and state/ import core only through src/core/index.ts', () => {
    const dirs = ['ui', 'state'].map((d) => join(root, 'src', d));
    const files = dirs.flatMap((d) => {
      try { return listFiles(d, /\.tsx?$/); } catch { return []; }
    });
    const coreIndex = join(coreDir, 'index');
    const violations: string[] = [];
    for (const file of files) {
      for (const spec of importSpecs(readFileSync(file, 'utf8'))) {
        if (!spec.startsWith('.')) continue;
        const target = resolve(dirname(file), spec).replace(/\.tsx?$/, '');
        const inCore = target === coreDir || target.startsWith(coreDir + sep);
        if (inCore && target !== coreDir && target !== coreIndex) violations.push(`${rel(file)}: '${spec}'`);
      }
    }
    expect(violations).toEqual([]);
  });
});
