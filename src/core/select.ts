// Greedy selection (A10): score = share^(1−v) × D^v, with a hard plain-ΔE distinctness floor.
import { hexToLab } from './color';
import { deltaE, hueFactor, varietyFactor, weightedDistance } from './distance';
import { MIN_DISTINCT_DE } from './tuning';
import type { Candidate, Controls, Hex, Lab, Pick } from './types';

export interface SelectResult {
  readonly picks: Pick[];
  readonly shortfall: boolean;
}

export function scoreCandidate(c: Candidate, chosen: readonly Lab[], v: number, h: number): number {
  let D = Infinity;
  for (const x of chosen) D = Math.min(D, weightedDistance(c.lab, x, h));
  return Math.pow(c.share, 1 - v) * Math.pow(D, v);
}

export function selectPalette(
  cands: readonly Candidate[],
  controls: Controls,
  locked: readonly Hex[],
  excluded: readonly number[],
): SelectResult {
  const v = varietyFactor(controls.variety);
  const h = hueFactor(controls.hueWeight);
  const chosen: Lab[] = locked.map(hexToLab);
  const excludedSet = new Set(excluded);
  let eligible = cands.filter(
    (c) => !excludedSet.has(c.index) && chosen.every((x) => deltaE(c.lab, x) >= MIN_DISTINCT_DE),
  );
  const target = controls.size - locked.length;
  const picks: Pick[] = [];
  while (picks.length < target && eligible.length > 0) {
    let best = eligible[0]!;
    if (chosen.length > 0) {
      let bestScore = -Infinity;
      for (const c of eligible) {
        const score = scoreCandidate(c, chosen, v, h);
        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }
    }
    picks.push({ hex: best.hex, candidateIndex: best.index });
    chosen.push(best.lab);
    const bestLab = best.lab;
    eligible = eligible.filter((c) => deltaE(c.lab, bestLab) >= MIN_DISTINCT_DE);
  }
  return { picks, shortfall: picks.length < target };
}
