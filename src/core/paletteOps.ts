// Palette entry operations (A12) and copy formatting. Invariant: locked entries first, hexes unique.
// Phase 11: locks (toggleLock, removeEntry, sizeMin). addPickedColor arrives with the eyedropper (Phase 12).
import { hexToLab } from './color';
import { deltaE } from './distance';
import { COPY_ALL_SEPARATOR, COPY_PREFIX, MIN_DISTINCT_DE, PALETTE_SIZE_MIN } from './tuning';
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

export function sizeMin(entries: readonly PaletteEntry[]): number {
  return Math.max(PALETTE_SIZE_MIN, entries.filter((e) => e.locked).length);
}

// Flips one entry's lock and keeps locked-first order (C3): a newly locked entry goes after the existing
// locked ones; a newly unlocked one goes to the front of the unlocked group.
export function toggleLock(entries: readonly PaletteEntry[], hex: Hex): PaletteEntry[] {
  const target = entries.find((e) => e.hex === hex);
  if (!target) return entries.slice();
  const flipped: PaletteEntry = { ...target, locked: !target.locked };
  const rest = entries.filter((e) => e.hex !== hex);
  // Both rules put the flipped entry at the boundary between the other locked and unlocked entries.
  return [...rest.filter((e) => e.locked), flipped, ...rest.filter((e) => !e.locked)];
}

export function removeEntry(entries: readonly PaletteEntry[], size: number, hex: Hex): { entries: PaletteEntry[]; size: number; needsExtraction: boolean } {
  const next = entries.filter((e) => e.hex !== hex);
  const nextSize = Math.max(PALETTE_SIZE_MIN, size - 1);
  return { entries: next, size: nextSize, needsExtraction: next.length < nextSize };
}

export function copyTextForHex(hex: Hex): string {
  return COPY_PREFIX + hex.slice(1);
}

export function copyTextForAll(hexes: readonly Hex[]): string {
  return hexes.map(copyTextForHex).join(COPY_ALL_SEPARATOR);
}
