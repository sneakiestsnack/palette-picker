// Palette entry operations (A12) and copy formatting. Invariant: locked entries first, hexes unique.
// Phase 6: mergeExtraction. addPickedColor / removeEntry / sizeMin arrive with locks (Phase 11–12).
import { hexToLab } from './color';
import { deltaE } from './distance';
import { COPY_ALL_SEPARATOR, COPY_PREFIX, MIN_DISTINCT_DE } from './tuning';
import type { Hex, PaletteEntry, Pick } from './types';

export function mergeExtraction(prev: readonly PaletteEntry[], picks: readonly Pick[], size: number): PaletteEntry[] {
  const locked = prev.filter((e) => e.locked);
  const lockedLabs = locked.map((e) => hexToLab(e.hex));
  const fresh = picks
    .filter((p) => {
      const lab = hexToLab(p.hex);
      return lockedLabs.every((l) => deltaE(lab, l) >= MIN_DISTINCT_DE);
    })
    .map((p): PaletteEntry => ({ hex: p.hex, locked: false, origin: 'extracted', candidateIndex: p.candidateIndex }));
  return [...locked, ...fresh].slice(0, Math.max(size, locked.length));
}

export function copyTextForHex(hex: Hex): string {
  return COPY_PREFIX + hex.slice(1);
}

export function copyTextForAll(hexes: readonly Hex[]): string {
  return hexes.map(copyTextForHex).join(COPY_ALL_SEPARATOR);
}
