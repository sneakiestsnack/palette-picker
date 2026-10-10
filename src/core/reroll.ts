// Deterministic re-roll (A11): exclude the candidates currently shown unlocked, cycling back when it runs out.
import { selectPalette, type SelectResult } from './select';
import type { Candidate, ExtractParams } from './types';

function sortedUnion(a: readonly number[], b: readonly number[]): number[] {
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}

// params.excluded = the previous exclusions; currentPicks = candidate indexes of the unlocked extracted entries shown.
export function reroll(
  cands: readonly Candidate[],
  params: ExtractParams,
  currentPicks: readonly number[],
): { result: SelectResult; excluded: number[] } {
  const target = currentPicks.length;
  const run = (excluded: number[]) => selectPalette(cands, params.controls, params.locked, excluded);

  const e1 = sortedUnion(params.excluded, currentPicks);
  const r1 = run(e1);
  if (r1.picks.length >= target) return { result: r1, excluded: e1 };

  const e2 = [...currentPicks].sort((x, y) => x - y);
  const r2 = run(e2);
  if (r2.picks.length >= target) return { result: r2, excluded: e2 };

  return { result: run([]), excluded: [] };
}
