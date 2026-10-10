import { describe, expect, it } from 'vitest';
import { sortEntries } from './sort';
import type { PaletteEntry } from './types';

const entry = (hex: string): PaletteEntry => ({ hex, locked: false, origin: 'extracted', candidateIndex: null });
const stripes = ['#FFFFFF', '#00FF00', '#000000', '#FFFF00', '#0000FF', '#FF0000'].map(entry);
const hexes = (es: PaletteEntry[]) => es.map((e) => e.hex);

describe('A20 sorting', () => {
  it('value', () => {
    expect(hexes(sortEntries(stripes, 'value'))).toEqual(['#000000', '#0000FF', '#FF0000', '#00FF00', '#FFFF00', '#FFFFFF']);
  });

  it('hue: chromatic by hue, then neutrals by value', () => {
    expect(hexes(sortEntries(stripes, 'hue'))).toEqual(['#FF0000', '#FFFF00', '#00FF00', '#0000FF', '#000000', '#FFFFFF']);
  });

  it('saturation: chroma descending', () => {
    expect(hexes(sortEntries(stripes, 'saturation'))).toEqual(['#0000FF', '#00FF00', '#FF0000', '#FFFF00', '#000000', '#FFFFFF']);
  });

  it('frequency: coverage share descending; missing shares last', () => {
    const cov = { palette: ['#000000', '#FFFFFF'], shares: [1 / 3, 2 / 3] };
    expect(hexes(sortEntries([entry('#000000'), entry('#FFFFFF')], 'frequency', cov))).toEqual(['#FFFFFF', '#000000']);
    expect(hexes(sortEntries([entry('#FF0000'), entry('#000000')], 'frequency', cov))).toEqual(['#000000', '#FF0000']);
  });

  it('does not mutate its input', () => {
    const copy = stripes.slice();
    sortEntries(stripes, 'hue');
    expect(stripes).toEqual(copy);
  });
});
