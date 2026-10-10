import { describe, expect, it } from 'vitest';
import { labToHex } from './color';
import { reroll } from './reroll';
import { selectPalette } from './select';
import type { Candidate, Controls, ExtractParams } from './types';

// Appendix B2: nine grays, lab = [0.1k, 0, 0], share = (10 − k) / 45, index = k − 1.
const cands: Candidate[] = Array.from({ length: 9 }, (_, i) => {
  const k = i + 1;
  return { index: i, hex: labToHex([0.1 * k, 0, 0]), lab: [0.1 * k, 0, 0], value: 10 * k, count: 10 - k, share: (10 - k) / 45 };
});
const controls: Controls = { size: 3, variety: 0, hueWeight: 35, valueRange: { min: 0, max: 100 } };
const params = (excluded: number[], locked: string[] = []): ExtractParams => ({ controls, locked, excluded });
const idx = (picks: readonly { candidateIndex: number }[]) => picks.map((p) => p.candidateIndex);

describe('B2 re-roll on nine grays', () => {
  it('initial select → g1 g2 g3', () => {
    expect(idx(selectPalette(cands, controls, [], []).picks)).toEqual([0, 1, 2]);
  });

  it('steps through and cycles back', () => {
    let r = reroll(cands, params([]), [0, 1, 2]);
    expect(idx(r.result.picks)).toEqual([3, 4, 5]);
    expect(r.excluded).toEqual([0, 1, 2]);

    r = reroll(cands, params([0, 1, 2]), [3, 4, 5]);
    expect(idx(r.result.picks)).toEqual([6, 7, 8]);
    expect(r.excluded).toEqual([0, 1, 2, 3, 4, 5]);

    r = reroll(cands, params([0, 1, 2, 3, 4, 5]), [6, 7, 8]);
    expect(idx(r.result.picks)).toEqual([0, 1, 2]);
    expect(r.excluded).toEqual([6, 7, 8]);
  });

  it('with g1 locked', () => {
    const locked = [cands[0]!.hex];
    expect(idx(selectPalette(cands, controls, locked, []).picks)).toEqual([1, 2]);
    expect(idx(reroll(cands, params([], locked), [1, 2]).result.picks)).toEqual([3, 4]);
  });
});
