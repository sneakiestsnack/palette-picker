import { describe, expect, it } from 'vitest';
import { buildCandidates } from './cluster';
import { hexToLab, hexToRgb8, valueOfHex } from './color';
import { deltaE } from './distance';
import { PaletteEngine } from './engine';
import { downsampleBox, toLabPixels } from './image';
import type { Controls, ExtractParams, Hex, RgbaImage } from './types';

// Synthetic replicas of the PNG fixtures (§6): vertical bands of solid colors.
function bands(width: number, height: number, spec: readonly [Hex, number][], alpha?: readonly number[]): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  const colOf: number[] = [];
  spec.forEach(([, w], i) => { for (let k = 0; k < w; k++) colOf.push(i); });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = colOf[x]!;
      const [r, g, b] = hexToRgb8(spec[i]![0]);
      data.set([r, g, b, alpha?.[i] ?? 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

const stripes = () => bands(600, 100, (['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'] as const).map((h) => [h, 100]));
const nearDuplicates = () => bands(300, 200, [['#3060C0', 120], ['#3161C1', 60], ['#3262C2', 45], ['#2F5FBF', 30], ['#3060C2', 30], ['#E02020', 15]]);
const transparentHalf = () => bands(100, 100, [['#00FF00', 50], ['#FF0000', 50]], [0, 255]);

// Seeded LCG perf image (§6). Test code may use this; product code never uses randomness.
function perfImage(): RgbaImage {
  const data = new Uint8ClampedArray(300 * 300 * 4);
  let state = 12345;
  for (let i = 0; i < data.length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    data[i] = state >>> 24;
  }
  return { width: 300, height: 300, data };
}

const controls = (c: Partial<Controls> = {}): Controls => ({
  size: 6, variety: 50, hueWeight: 35, valueRange: { min: 0, max: 100 }, ...c,
});
const params = (c: Partial<Controls> = {}, locked: Hex[] = []): ExtractParams => ({ controls: controls(c), locked, excluded: [] });

function engineWith(img: RgbaImage): PaletteEngine {
  const e = new PaletteEngine();
  e.load(1, img);
  return e;
}
const hexes = (e: PaletteEngine, p: ExtractParams) => e.extract(p).picks.map((x) => x.hex);
const byValue = (hs: Hex[]) => [...hs].sort((a, b) => valueOfHex(a) - valueOfHex(b) || (a < b ? -1 : 1));

describe('A9 candidates', () => {
  it('stripes → six equal candidates in index order', () => {
    const px = toLabPixels(downsampleBox(stripes(), 300));
    const { candidates } = buildCandidates(px, { min: 0, max: 100 });
    expect(candidates.map((c) => c.hex)).toEqual(['#000000', '#0000FF', '#FF0000', '#00FF00', '#FFFF00', '#FFFFFF']);
    for (const c of candidates) expect(c.share).toBeCloseTo(1 / 6, 10);
  });

  it('near-duplicates → shares and tie order', () => {
    const { candidates } = buildCandidates(toLabPixels(nearDuplicates()), { min: 0, max: 100 });
    expect(candidates.map((c) => c.hex)).toEqual(['#3060C0', '#3161C1', '#3262C2', '#2F5FBF', '#3060C2', '#E02020']);
    expect(candidates.map((c) => c.share)).toEqual([0.4, 0.2, 0.15, 0.1, 0.1, 0.05].map((s) => expect.closeTo(s, 10)));
  });
});

describe('PaletteEngine on synthetic fixtures', () => {
  it('load reports sizes and histogram', () => {
    const info = new PaletteEngine().load(7, stripes());
    expect(info.imageId).toBe(7);
    expect([info.width, info.height, info.processingWidth, info.processingHeight]).toEqual([600, 100, 300, 50]);
    expect(info.valueMap.length).toBe(600 * 100);
    expect(info.histogram.reduce((a, b) => a + b, 0)).toBe(300 * 50);
  });

  it('stripes defaults', () => {
    const e = engineWith(stripes());
    const r = e.extract(params());
    expect(byValue(r.picks.map((p) => p.hex))).toEqual(['#000000', '#0000FF', '#FF0000', '#00FF00', '#FFFF00', '#FFFFFF']);
    expect(r.picks.map((p) => valueOfHex(p.hex)).sort((a, b) => a - b)).toEqual([0, 45, 63, 87, 97, 100]);
    expect(r.shortfall).toBe(false);
  });

  it('stripes size 3, variety 0 and 100', () => {
    const e = engineWith(stripes());
    expect(byValue(hexes(e, params({ size: 3, variety: 0 })))).toEqual(['#000000', '#0000FF', '#FF0000']);
    expect(hexes(e, params({ size: 3, variety: 100 }))).toEqual(['#000000', '#FFFFFF', '#0000FF']);
  });

  it('stripes range 40–90 → three colors and shortfall', () => {
    const r = engineWith(stripes()).extract(params({ valueRange: { min: 40, max: 90 } }));
    expect(byValue(r.picks.map((p) => p.hex))).toEqual(['#0000FF', '#FF0000', '#00FF00']);
    expect(r.shortfall).toBe(true);
  });

  it('near-duplicates at any variety → #3060C0 #E02020 + shortfall', () => {
    const e = engineWith(nearDuplicates());
    for (const variety of [0, 25, 50, 75, 100]) {
      const r = e.extract(params({ variety }));
      expect(byValue(r.picks.map((p) => p.hex))).toEqual(['#3060C0', '#E02020']);
      expect(r.shortfall).toBe(true);
    }
    expect(['#3060C0', '#E02020'].map(valueOfHex)).toEqual([51, 58]);
  });

  it('transparent-half → #FF0000 only + shortfall', () => {
    const r = engineWith(transparentHalf()).extract(params());
    expect(r.picks.map((p) => p.hex)).toEqual(['#FF0000']);
    expect(r.shortfall).toBe(true);
  });

  it('empty range → zero picks and shortfall', () => {
    const r = engineWith(nearDuplicates()).extract(params({ valueRange: { min: 0, max: 10 } }));
    expect(r.picks).toEqual([]);
    expect(r.shortfall).toBe(true);
    expect(r.inRangePixelCount).toBe(0);
  });

  it('extract before load throws', () => {
    expect(() => new PaletteEngine().extract(params())).toThrow();
  });
});

describe('distinctness floor and determinism (seeded perf image)', () => {
  const e = engineWith(perfImage());
  const combos: { c: Partial<Controls>; locked: Hex[] }[] = [];
  for (const size of [2, 6, 16])
    for (const variety of [0, 50, 100])
      for (const hueWeight of [0, 35, 100]) combos.push({ c: { size, variety, hueWeight }, locked: [] });
  for (const [min, max] of [[0, 100], [20, 60], [70, 100]] as const) combos.push({ c: { valueRange: { min, max } }, locked: [] });

  it.each(combos.map((x, i) => [i, x] as const))('combo %i', (_i, { c, locked }) => {
    const p = params(c, locked);
    const r1 = e.extract(p);
    const r2 = e.extract(p);
    expect(r2).toEqual(r1);
    const all = [...locked, ...r1.picks.map((x) => x.hex)].map(hexToLab);
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) expect(deltaE(all[i]!, all[j]!)).toBeGreaterThanOrEqual(0.04);
    expect(r1.picks.length).toBeLessThanOrEqual(p.controls.size);
  });
});

describe('perf smoke', () => {
  it('load + extract < 400 ms; cached re-extract < 20 ms', () => {
    const img = perfImage();
    const e = new PaletteEngine();
    const t0 = performance.now();
    e.load(1, img);
    e.extract(params());
    const t1 = performance.now();
    e.extract(params({ variety: 80 }));
    const t2 = performance.now();
    console.log(`perf: load+extract ${(t1 - t0).toFixed(1)} ms, cached extract ${(t2 - t1).toFixed(1)} ms`);
    expect(t1 - t0).toBeLessThan(400);
    expect(t2 - t1).toBeLessThan(20);
  });
});
