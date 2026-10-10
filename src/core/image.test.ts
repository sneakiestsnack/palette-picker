import { describe, expect, it } from 'vitest';
import { downsampleBox, inRangeIndices, scaledSize, toLabPixels, valueHistogram, valueMap } from './image';
import type { RgbaImage } from './types';

type Px = readonly [number, number, number, number];
const img = (width: number, height: number, px: readonly Px[]): RgbaImage => ({
  width, height, data: new Uint8ClampedArray(px.flat()),
});
const pixels = (im: RgbaImage): number[][] => {
  const out: number[][] = [];
  for (let i = 0; i < im.data.length; i += 4) out.push(Array.from(im.data.subarray(i, i + 4)));
  return out;
};

const BLACK: Px = [0, 0, 0, 255];
const WHITE: Px = [255, 255, 255, 255];
const RED: Px = [255, 0, 0, 255];
const CLEAR: Px = [0, 255, 0, 0];

describe('A5 scaledSize', () => {
  it.each([
    [600, 100, 300, [300, 50]],
    [8000, 6250, 2048, [2048, 1600]],
    [8000, 6000, 2048, [2048, 1536]],
    [1, 5000, 300, [1, 300]],
    [200, 100, 300, [200, 100]],
  ] as const)('scaledSize(%i, %i, %i)', (w, h, m, expected) => {
    expect(scaledSize(w, h, m)).toEqual(expected);
  });
});

describe('A5 downsampleBox', () => {
  it('averages in linear light: black + white = 188', () => {
    const out = downsampleBox(img(4, 1, [BLACK, WHITE, BLACK, WHITE]), 2);
    expect([out.width, out.height]).toEqual([2, 1]);
    expect(pixels(out)).toEqual([[188, 188, 188, 255], [188, 188, 188, 255]]);
  });

  it('partitions the source exactly', () => {
    const out = downsampleBox(img(3, 1, [RED, BLACK, WHITE]), 2);
    expect(pixels(out)).toEqual([[255, 0, 0, 255], [188, 188, 188, 255]]);
  });

  it('alpha rule: half opaque stays opaque, mostly transparent becomes transparent', () => {
    expect(pixels(downsampleBox(img(2, 1, [RED, CLEAR]), 1))).toEqual([[255, 0, 0, 255]]);
    expect(pixels(downsampleBox(img(4, 1, [CLEAR, CLEAR, CLEAR, RED]), 1))).toEqual([[0, 0, 0, 0]]);
  });

  it('no scaling returns an equal copy', () => {
    const src = img(2, 1, [RED, WHITE]);
    const out = downsampleBox(src, 300);
    expect(out.data).not.toBe(src.data);
    expect(Array.from(out.data)).toEqual(Array.from(src.data));
  });
});

describe('A6 pixel lists', () => {
  // [#000000, #808080 alpha 0, #FFFFFF, #0000FF]
  const im = img(2, 2, [BLACK, [128, 128, 128, 0], WHITE, [0, 0, 255, 255]]);

  it('toLabPixels skips transparent pixels', () => {
    const px = toLabPixels(im);
    expect(px.count).toBe(3);
    expect(Array.from(px.value)).toEqual([0, 100, 45]);
    expect(px.lab.length).toBe(9);
    expect(px.lab[3]).toBeCloseTo(1, 4);
  });

  it('valueMap uses sentinel 255 for transparent', () => {
    expect(Array.from(valueMap(im))).toEqual([0, 255, 100, 45]);
  });

  it('valueHistogram', () => {
    const h = valueHistogram(toLabPixels(im));
    expect(h.length).toBe(101);
    expect(h[0]).toBe(1);
    expect(h[45]).toBe(1);
    expect(h[100]).toBe(1);
    expect(h.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('inRangeIndices', () => {
    expect(Array.from(inRangeIndices(toLabPixels(im), { min: 40, max: 100 }))).toEqual([1, 2]);
  });
});
