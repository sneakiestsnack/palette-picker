// Swatch display order (A20). Every mode ends in total tie-breakers (value, then hex).
import { hexToLab, labToLch, valueOfL } from './color';
import { ACHROMATIC_C } from './tuning';
import type { Hex, PaletteEntry, SortMode } from './types';

export interface Coverage { readonly palette: readonly Hex[]; readonly shares: readonly number[] }

const cmpHex = (a: Hex, b: Hex) => (a < b ? -1 : a > b ? 1 : 0);

export function sortEntries(entries: readonly PaletteEntry[], mode: SortMode, coverage?: Coverage | null): PaletteEntry[] {
  const keyed = entries.map((e) => {
    const lab = hexToLab(e.hex);
    const [L, C, h] = labToLch(lab);
    const i = coverage ? coverage.palette.indexOf(e.hex) : -1;
    // Chroma is compared at 1e-6 so float noise (white comes out at C ≈ 1e-8, not 0) ties and falls to value/hex.
    return { e, L, C, h, cKey: Math.round(C * 1e6), value: valueOfL(L), share: i >= 0 ? coverage!.shares[i]! : -1 };
  });
  type K = (typeof keyed)[number];
  const byValue = (p: K, q: K) => p.value - q.value || cmpHex(p.e.hex, q.e.hex);

  const comparators: Record<SortMode, (p: K, q: K) => number> = {
    value: (p, q) => p.value - q.value || p.L - q.L || cmpHex(p.e.hex, q.e.hex),
    hue: (p, q) => {
      const pc = p.C >= ACHROMATIC_C;
      const qc = q.C >= ACHROMATIC_C;
      if (pc !== qc) return pc ? -1 : 1;                     // chromatic first
      return (pc ? p.h - q.h : 0) || byValue(p, q);
    },
    saturation: (p, q) => q.cKey - p.cKey || byValue(p, q),
    frequency: (p, q) => q.share - p.share || byValue(p, q),
  };
  keyed.sort(comparators[mode]);
  return keyed.map((k) => k.e);
}
