// Median cut (A7), Lloyd refinement (A8), candidates (A9).
import { hexToLab, labToHex, valueOfHex } from './color';
import { inRangeIndices } from './image';
import { CANDIDATE_COUNT, KMEANS_ITERATIONS, MIN_CANDIDATE_SHARE } from './tuning';
import type { Candidate, Hex, Lab, LabPixels, ValueRange } from './types';

export interface Box {
  readonly ids: Int32Array;
  readonly count: number;
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

function makeBox(px: LabPixels, ids: Int32Array): Box {
  const lab = px.lab;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < ids.length; k++) {
    const o = ids[k]! * 3;
    for (let c = 0; c < 3; c++) {
      const v = lab[o + c]!;
      if (v < min[c]!) min[c] = v;
      if (v > max[c]!) max[c] = v;
    }
  }
  return { ids, count: ids.length, min, max };
}

function maxExtent(b: Box): number {
  return Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
}

export function medianCut(px: LabPixels, ids: Int32Array, K: number = CANDIDATE_COUNT): Box[] {
  const lab = px.lab;
  const boxes: Box[] = [makeBox(px, ids)];
  while (boxes.length < K) {
    let pos = -1;
    let bestPriority = -1;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]!;
      const ext = maxExtent(b);
      if (b.count < 2 || !(ext > 0)) continue;
      const priority = b.count * ext;
      if (priority > bestPriority) {
        bestPriority = priority;
        pos = i;
      }
    }
    if (pos < 0) break;
    const box = boxes[pos]!;
    const e0 = box.max[0] - box.min[0];
    const e1 = box.max[1] - box.min[1];
    const e2 = box.max[2] - box.min[2];
    const axis = e0 >= e1 && e0 >= e2 ? 0 : e1 >= e2 ? 1 : 2;
    const sorted = box.ids.slice().sort((p, q) => {
      const po = p * 3;
      const qo = q * 3;
      return (
        lab[po + axis]! - lab[qo + axis]! ||
        lab[po]! - lab[qo]! ||
        lab[po + 1]! - lab[qo + 1]! ||
        lab[po + 2]! - lab[qo + 2]! ||
        p - q
      );
    });
    const m = Math.floor(box.count / 2);
    boxes[pos] = makeBox(px, sorted.subarray(0, m));
    boxes.push(makeBox(px, sorted.subarray(m)));
  }
  return boxes;
}

function meanLab(px: LabPixels, ids: Int32Array): [number, number, number] {
  let L = 0;
  let a = 0;
  let b = 0;
  for (let k = 0; k < ids.length; k++) {
    const o = ids[k]! * 3;
    L += px.lab[o]!;
    a += px.lab[o + 1]!;
    b += px.lab[o + 2]!;
  }
  const n = ids.length;
  return [L / n, a / n, b / n];
}

// Nearest centroid by squared deltaE for each id; ties → lower centroid index.
function assign(px: LabPixels, ids: Int32Array, cents: Float64Array, k: number, out: Int32Array): void {
  const lab = px.lab;
  for (let n = 0; n < ids.length; n++) {
    const o = ids[n]! * 3;
    const L = lab[o]!;
    const a = lab[o + 1]!;
    const b = lab[o + 2]!;
    let best = 0;
    let bestD = Infinity;
    for (let c = 0; c < k; c++) {
      const dL = L - cents[c * 3]!;
      const da = a - cents[c * 3 + 1]!;
      const db = b - cents[c * 3 + 2]!;
      const d = dL * dL + da * da + db * db;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    out[n] = best;
  }
}

export function refine(px: LabPixels, ids: Int32Array, boxes: readonly Box[]): { centroids: Lab[]; counts: number[] } {
  let k = boxes.length;
  let cents = new Float64Array(k * 3);
  boxes.forEach((box, i) => cents.set(meanLab(px, box.ids), i * 3));
  const owner = new Int32Array(ids.length);
  const lab = px.lab;
  for (let iter = 0; iter < KMEANS_ITERATIONS; iter++) {
    assign(px, ids, cents, k, owner);
    const sums = new Float64Array(k * 3);
    const counts = new Float64Array(k);
    for (let n = 0; n < ids.length; n++) {
      const c = owner[n]!;
      const o = ids[n]! * 3;
      sums[c * 3] += lab[o]!;
      sums[c * 3 + 1] += lab[o + 1]!;
      sums[c * 3 + 2] += lab[o + 2]!;
      counts[c]++;
    }
    let kept = 0;
    const next = new Float64Array(k * 3);
    for (let c = 0; c < k; c++) {
      const cnt = counts[c]!;
      if (cnt === 0) continue;
      next[kept * 3] = sums[c * 3]! / cnt;
      next[kept * 3 + 1] = sums[c * 3 + 1]! / cnt;
      next[kept * 3 + 2] = sums[c * 3 + 2]! / cnt;
      kept++;
    }
    k = kept;
    cents = next;
  }
  assign(px, ids, cents, k, owner);
  const counts = new Array<number>(k).fill(0);
  for (let n = 0; n < ids.length; n++) counts[owner[n]!]!++;
  const centroids: Lab[] = [];
  for (let c = 0; c < k; c++) centroids.push([cents[c * 3]!, cents[c * 3 + 1]!, cents[c * 3 + 2]!]);
  return { centroids, counts };
}

export function buildCandidates(px: LabPixels, range: ValueRange): { candidates: Candidate[]; inRangePixelCount: number } {
  const ids = inRangeIndices(px, range);
  const total = ids.length;
  if (total === 0) return { candidates: [], inRangePixelCount: 0 };
  const { centroids, counts } = refine(px, ids, medianCut(px, ids));

  const merged = new Map<Hex, number>();
  centroids.forEach((c, i) => {
    const hex = labToHex(c);
    merged.set(hex, (merged.get(hex) ?? 0) + counts[i]!);
  });
  let entries = [...merged].map(([hex, count]) => ({ hex, count, value: valueOfHex(hex) }));
  const kept = entries.filter((e) => e.count / total >= MIN_CANDIDATE_SHARE);
  if (kept.length > 0) entries = kept;
  entries.sort((p, q) => q.count - p.count || p.value - q.value || (p.hex < q.hex ? -1 : p.hex > q.hex ? 1 : 0));

  const candidates = entries.map((e, index): Candidate => ({
    index,
    hex: e.hex,
    lab: hexToLab(e.hex),
    value: e.value,
    count: e.count,
    share: e.count / total,
  }));
  return { candidates, inRangePixelCount: total };
}
