// Palette entry operations (A12) and copy formatting. Invariant: locked entries first, hexes unique.
// Locks (toggleLock, removeEntry, sizeMin) and picked colors (addPickedColor, eyedropper and harmony).
import { hexToLab } from './color';
import { deltaE } from './distance';
import { COPY_ALL_SEPARATOR, COPY_PREFIX, MIN_DISTINCT_DE, PALETTE_SIZE_MAX, PALETTE_SIZE_MIN } from './tuning';
import type { EntryOrigin, Hex, PaletteEntry, Pick } from './types';

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

export type PickOutcome = 'added' | 'replaced' | 'duplicate' | 'full';

// A picked color becomes a locked entry right after the existing locked ones (A12).
export function addPickedColor(
  entries: readonly PaletteEntry[],
  size: number,
  hex: Hex,
  origin: EntryOrigin,
): { entries: PaletteEntry[]; size: number; outcome: PickOutcome } {
  const lab = hexToLab(hex);
  const close = (e: PaletteEntry) => deltaE(hexToLab(e.hex), lab) < MIN_DISTINCT_DE;
  const newE: PaletteEntry = { hex, locked: true, origin, candidateIndex: null };
  const unchanged = { entries: entries.slice(), size };

  if (entries.some((e) => e.locked && close(e))) return { ...unchanged, outcome: 'duplicate' };

  const insert = (list: readonly PaletteEntry[]) => {
    const locked = list.filter((e) => e.locked);
    return [...locked, newE, ...list.filter((e) => !e.locked)];
  };

  const u = entries.find((e) => !e.locked && close(e));
  if (u) return { entries: insert(entries.filter((e) => e !== u)), size, outcome: 'replaced' };
  if (size < PALETTE_SIZE_MAX) return { entries: insert(entries), size: size + 1, outcome: 'added' };

  const lastUnlocked = [...entries].reverse().find((e) => !e.locked);
  if (lastUnlocked) return { entries: insert(entries.filter((e) => e !== lastUnlocked)), size, outcome: 'added' };
  return { ...unchanged, outcome: 'full' };
}

export function copyTextForHex(hex: Hex): string {
  return COPY_PREFIX + hex.slice(1);
}

export function copyTextForAll(hexes: readonly Hex[]): string {
  return hexes.map(copyTextForHex).join(COPY_ALL_SEPARATOR);
}
