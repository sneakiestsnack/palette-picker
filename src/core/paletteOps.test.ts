import { describe, expect, it } from 'vitest';
import { copyTextForAll, copyTextForHex, mergeExtraction } from './paletteOps';
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
    expect(copyTextForHex('#FFBE98')).toBe('#FFBE98');
    expect(copyTextForAll(['#000000', '#FFFFFF'])).toBe('#000000\n#FFFFFF');
  });
});

describe('A20 sort (value)', () => {
  it('stripes palette by value', () => {
    const entries = ['#FFFFFF', '#00FF00', '#000000', '#FFFF00', '#0000FF', '#FF0000'].map((h) => U(h));
    expect(sortEntries(entries, 'value').map((e) => e.hex)).toEqual(['#000000', '#0000FF', '#FF0000', '#00FF00', '#FFFF00', '#FFFFFF']);
  });
});
