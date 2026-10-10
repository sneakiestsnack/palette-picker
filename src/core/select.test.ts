import { describe, expect, it } from 'vitest';
import { labToHex } from './color';
import { deltaE, hueFactor, varietyFactor } from './distance';
import { scoreCandidate, selectPalette } from './select';
import type { Candidate, Controls, Lab } from './types';

// Appendix B1: five candidates given directly.
const rows: [Lab, number][] = [
  [[0.3, 0, 0], 0.4],
  [[0.33, 0, 0], 0.25],
  [[0.4, 0, 0], 0.15],
  [[0.8, 0.1, 0.05], 0.12],
  [[0.6, -0.1, -0.1], 0.08],
];
const cands: Candidate[] = rows.map(([lab, share], index) => ({
  index, hex: `#00000${index + 1}`, lab, value: 0, count: 0, share,
}));

const controls = (size: number, variety: number, hueWeight = 100): Controls => ({
  size, variety, hueWeight, valueRange: { min: 0, max: 100 },
});
const names = (r: ReturnType<typeof selectPalette>) => r.picks.map((p) => `c${p.candidateIndex}`);

describe('B1 greedy selection', () => {
  it('distances match the worked example', () => {
    const d = (i: number, j: number) => deltaE(cands[i]!.lab, cands[j]!.lab);
    expect(d(0, 1)).toBeCloseTo(0.03, 6);
    expect(d(0, 2)).toBeCloseTo(0.1, 6);
    expect(d(0, 3)).toBeCloseTo(0.512348, 5);
    expect(d(0, 4)).toBeCloseTo(0.331662, 5);
    expect(d(2, 3)).toBeCloseTo(0.415331, 5);
    expect(d(3, 4)).toBeCloseTo(0.320156, 5);
  });

  it.each([
    [3, 0, 100, ['c0', 'c2', 'c3'], false],
    [3, 25, 100, ['c0', 'c3', 'c2'], false],
    [3, 50, 100, ['c0', 'c3', 'c4'], false],
    [3, 75, 100, ['c0', 'c3', 'c4'], false],
    [3, 100, 100, ['c0', 'c3', 'c4'], false],
    [4, 0, 100, ['c0', 'c2', 'c3', 'c4'], false],
    [5, 0, 100, ['c0', 'c2', 'c3', 'c4'], true],
    [3, 50, 0, ['c0', 'c3', 'c4'], false],
  ] as const)('size %i, variety %i, hue %i', (size, variety, hue, expected, shortfall) => {
    const r = selectPalette(cands, controls(size, variety, hue), [], []);
    expect(names(r)).toEqual(expected);
    expect(r.shortfall).toBe(shortfall);
  });

  it('locked color is an anchor', () => {
    const r = selectPalette(cands, controls(3, 0), [labToHex(cands[3]!.lab)], []);
    expect(names(r)).toEqual(['c0', 'c2']);
    expect(r.shortfall).toBe(false);
  });

  it('intermediate scores at variety 25', () => {
    const v = varietyFactor(25);
    const h = hueFactor(100);
    const r1 = [cands[0]!.lab];
    expect(scoreCandidate(cands[2]!, r1, v, h)).toBeCloseTo(0.13554, 4);
    expect(scoreCandidate(cands[3]!, r1, v, h)).toBeCloseTo(0.1725, 4);
    expect(scoreCandidate(cands[4]!, r1, v, h)).toBeCloseTo(0.11415, 4);
    const r2 = [cands[0]!.lab, cands[3]!.lab];
    expect(scoreCandidate(cands[2]!, r2, v, h)).toBeCloseTo(0.13554, 4);
    expect(scoreCandidate(cands[4]!, r2, v, h)).toBeCloseTo(0.11315, 4);
  });

  it('prefix stability', () => {
    for (const variety of [0, 25, 50, 75, 100]) {
      for (let n = 2; n < 5; n++) {
        const small = selectPalette(cands, controls(n, variety), [], []).picks;
        const big = selectPalette(cands, controls(n + 1, variety), [], []).picks;
        expect(big.slice(0, small.length)).toEqual(small);
      }
    }
  });

  it('excluded candidates are skipped', () => {
    expect(names(selectPalette(cands, controls(3, 0), [], [0]))).toEqual(['c1', 'c2', 'c3']);
  });
});
