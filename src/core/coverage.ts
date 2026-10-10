// Coverage shares and the show-where label map (A14). Both assign each in-range pixel to its nearest
// palette color (plain ΔE), so the proportion bar and the highlight always agree.
import { SRGB_TO_LINEAR, hexToLab, valueOfL } from './color';
import { ALPHA_OPAQUE_MIN } from './tuning';
import type { Hex, LabPixels, RgbaImage, ValueRange } from './types';

export const NO_LABEL = 255;

function flatLabs(palette: readonly Hex[]): Float64Array {
  const out = new Float64Array(palette.length * 3);
  palette.forEach((h, i) => out.set(hexToLab(h), i * 3));
  return out;
}

// argmin squared ΔE; ties → lower index.
function nearest(L: number, a: number, b: number, labs: Float64Array, n: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < n; i++) {
    const dL = L - labs[i * 3]!;
    const da = a - labs[i * 3 + 1]!;
    const db = b - labs[i * 3 + 2]!;
    const d = dL * dL + da * da + db * db;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function coverageShares(px: LabPixels, range: ValueRange, palette: readonly Hex[]): { shares: number[]; inRangePixelCount: number } {
  const n = palette.length;
  const counts = new Array<number>(n).fill(0);
  if (n === 0) return { shares: [], inRangePixelCount: 0 };
  const labs = flatLabs(palette);
  let total = 0;
  for (let i = 0; i < px.count; i++) {
    const v = px.value[i]!;
    if (v < range.min || v > range.max) continue;
    total++;
    counts[nearest(px.lab[i * 3]!, px.lab[i * 3 + 1]!, px.lab[i * 3 + 2]!, labs, n)]!++;
  }
  return { shares: counts.map((c) => (total === 0 ? 0 : c / total)), inRangePixelCount: total };
}

// One byte per mask pixel: the palette index, or NO_LABEL for transparent / out-of-range pixels.
export function labelMap(mask: RgbaImage, range: ValueRange, palette: readonly Hex[]): Uint8Array {
  const d = mask.data;
  const total = mask.width * mask.height;
  const out = new Uint8Array(total).fill(NO_LABEL);
  const n = palette.length;
  if (n === 0) return out;
  const labs = flatLabs(palette);
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    if (d[p + 3]! < ALPHA_OPAQUE_MIN) continue;
    const r = SRGB_TO_LINEAR[d[p]!]!;
    const g = SRGB_TO_LINEAR[d[p + 1]!]!;
    const b = SRGB_TO_LINEAR[d[p + 2]!]!;
    const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
    const v = valueOfL(L);
    if (v < range.min || v > range.max) continue;
    out[i] = nearest(
      L,
      1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
      0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
      labs,
      n,
    );
  }
  return out;
}
