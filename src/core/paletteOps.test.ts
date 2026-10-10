import { describe, expect, it } from 'vitest';
import { grayHexForValue } from './color';
import { addPickedColor, copyTextForAll, copyTextForHex, mergeExtraction, removeEntry, sizeMin, toggleLock } from './paletteOps';
import { sortEntries } from './sort';
import type { PaletteEntry } from './types';

const U = (hex: string, candidateIndex: number | null = null): PaletteEntry => ({ hex, locked: false, origin: 'extracted', candidateIndex });
const L = (hex: string): PaletteEntry => ({ hex, locked: true, origin: 'extracted', candidateIndex: null });

describe('A12 mergeExtraction', () => {
  it('keeps locked first and drops picks too close to them', () => {
    const out = mergeExtraction([L('#0000FF')], [
      { hex: '#000000', candidateIndex: 0 },
      { hex: '#0000FF', candidateIndex: 1 },
      { hex: '#FF0000', candidateIndex: 2 },
    ], 3);
    expect(out).toEqual([L('#0000FF'), U('#000000', 0), U('#FF0000', 2)]);
  });

  it('with nothing locked the picks become the palette', () => {
    const out = mergeExtraction([U('#123456', 4)], [{ hex: '#000000', candidateIndex: 0 }], 6);
    expect(out).toEqual([U('#000000', 0)]);
  });

  it('truncates to size', () => {
    const picks = ['#000000', '#FFFFFF', '#FF0000'].map((hex, i) => ({ hex, candidateIndex: i }));
    expect(mergeExtraction([], picks, 2).map((e) => e.hex)).toEqual(['#000000', '#FFFFFF']);
  });
});

describe('copy text', () => {
  it('single and all', () => {
    // COPY_PREFIX is '' (CSP ignores a pasted '#').
    expect(copyTextForHex('#FFBE98')).toBe('FFBE98');
    expect(copyTextForAll(['#000000', '#FFFFFF'])).toBe('000000\nFFFFFF');
  });
});

describe('A20 sort (value)', () => {
  it('stripes palette by value', () => {
    const entries = ['#FFFFFF', '#00FF00', '#000000', '#FFFF00', '#0000FF', '#FF0000'].map((h) => U(h));
    expect(sortEntries(entries, 'value').map((e) => e.hex)).toEqual(['#000000', '#0000FF', '#FF0000', '#00FF00', '#FFFF00', '#FFFFFF']);
  });
});

describe('A12 locks', () => {
  it('removeEntry', () => {
    expect(removeEntry([L('#FF0000'), U('#000000')], 2, '#FF0000')).toEqual({ entries: [U('#000000')], size: 2, needsExtraction: true });
    expect(removeEntry([L('#FF0000'), U('#000000'), U('#FFFFFF')], 3, '#FF0000')).toEqual({ entries: [U('#000000'), U('#FFFFFF')], size: 2, needsExtraction: false });
  });

  it('sizeMin', () => {
    expect(sizeMin([U('#000000')])).toBe(2);
    expect(sizeMin([L('#000000'), L('#FFFFFF'), L('#FF0000'), U('#00FF00')])).toBe(3);
  });

  it('toggleLock keeps locked first', () => {
    const e = [L('#000000'), U('#FFFFFF'), U('#FF0000')];
    expect(toggleLock(e, '#FF0000').map((x) => [x.hex, x.locked])).toEqual([['#000000', true], ['#FF0000', true], ['#FFFFFF', false]]);
    const twoLocked = [L('#000000'), L('#FF0000'), U('#FFFFFF')];
    expect(toggleLock(twoLocked, '#000000').map((x) => [x.hex, x.locked])).toEqual([['#FF0000', true], ['#000000', false], ['#FFFFFF', false]]);
  });
});

describe('A12 addPickedColor', () => {
  const E0 = [U('#000000'), U('#FFFFFF')];
  const pickedL = (hex: string): PaletteEntry => ({ hex, locked: true, origin: 'eyedropper', candidateIndex: null });

  it('adds a new color after the locked ones', () => {
    expect(addPickedColor(E0, 2, '#FFFF00', 'eyedropper')).toEqual({ entries: [pickedL('#FFFF00'), ...E0], size: 3, outcome: 'added' });
  });

  it('replaces a close unlocked color', () => {
    expect(addPickedColor(E0, 2, '#FFFFFF', 'eyedropper')).toEqual({ entries: [pickedL('#FFFFFF'), U('#000000')], size: 2, outcome: 'replaced' });
  });

  it('a color close to a locked one is a duplicate', () => {
    const e = [L('#FFFFFF'), U('#000000')];
    expect(addPickedColor(e, 2, '#FEFEFE', 'eyedropper')).toEqual({ entries: e, size: 2, outcome: 'duplicate' });
  });

  const grays = Array.from({ length: 16 }, (_, k) => grayHexForValue(6 * k));

  it('at size 16 the last unlocked entry makes room', () => {
    const e = grays.map((h, k) => (k === 0 ? L(h) : U(h)));
    const r = addPickedColor(e, 16, '#FF0000', 'eyedropper');
    expect(r.outcome).toBe('added');
    expect(r.size).toBe(16);
    expect(r.entries.map((x) => x.hex)).toEqual([grays[0], '#FF0000', ...grays.slice(1, 15)]);
    expect(r.entries.map((x) => x.locked)).toEqual([true, true, ...Array(14).fill(false)]);
  });

  it('16 locked entries → full', () => {
    const e = grays.map(L);
    expect(addPickedColor(e, 16, '#FF0000', 'eyedropper')).toEqual({ entries: e, size: 16, outcome: 'full' });
  });
});
