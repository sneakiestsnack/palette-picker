// Swatch display order (A20). Phase 6: value mode; Phase 14 adds hue, saturation and frequency.
import { hexToLab, valueOfL } from './color';
import type { Hex, PaletteEntry, SortMode } from './types';

export interface Coverage { readonly palette: readonly Hex[]; readonly shares: readonly number[] }

const cmpHex = (a: Hex, b: Hex) => (a < b ? -1 : a > b ? 1 : 0);

export function sortEntries(entries: readonly PaletteEntry[], _mode: SortMode, _coverage?: Coverage | null): PaletteEntry[] {
  const keyed = entries.map((e) => {
    const L = hexToLab(e.hex)[0];
    return { e, L, value: valueOfL(L) };
  });
  keyed.sort((p, q) => p.value - q.value || p.L - q.L || cmpHex(p.e.hex, q.e.hex));
  return keyed.map((k) => k.e);
}
