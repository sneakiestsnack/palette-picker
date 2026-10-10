import { useMemo, useRef } from 'react';
import { sortEntries, type PaletteEntry } from '../core';
import { isCoverageSettled } from '../state/appState';
import { useApp } from '../state/AppProvider';

// The swatches in display order (A20). The palette grid, Copy all and the exports all use this, so they agree.
// Frequency needs coverage for the current entries; until it arrives the previous order is kept (no flicker),
// with any new entries appended by value.
export function useDisplayEntries(): PaletteEntry[] {
  const { state } = useApp();
  const { entries } = state.palette;
  const { sortMode, coverage } = state;
  const settled = isCoverageSettled(state);
  const previous = useRef<PaletteEntry[]>([]);

  const display = useMemo(() => {
    if (sortMode !== 'frequency' || settled) return sortEntries(entries, sortMode, coverage);
    const byHex = new Map(entries.map((e) => [e.hex, e]));
    const kept = previous.current.map((e) => byHex.get(e.hex)).filter((e): e is PaletteEntry => e !== undefined);
    const keptHexes = new Set(kept.map((e) => e.hex));
    return [...kept, ...sortEntries(entries.filter((e) => !keptHexes.has(e.hex)), 'value')];
  }, [entries, sortMode, coverage, settled]);

  previous.current = display;
  return display;
}
