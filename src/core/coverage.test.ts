import { describe, expect, it } from 'vitest';
import { hexToRgb8 } from './color';
import { NO_LABEL, coverageShares, labelMap } from './coverage';
import { downsampleBox, toLabPixels } from './image';
import type { RgbaImage } from './types';

const STRIPES = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'];

function stripes(): RgbaImage {
  const data = new Uint8ClampedArray(600 * 100 * 4);
  for (let y = 0; y < 100; y++)
    for (let x = 0; x < 600; x++) data.set([...hexToRgb8(STRIPES[Math.floor(x / 100)]!), 255], (y * 600 + x) * 4);
  return { width: 600, height: 100, data };
}

describe('A14 coverage', () => {
  const px = toLabPixels(downsampleBox(stripes(), 300));

  it('black/white palette → 1/3, 2/3', () => {
    const { shares, inRangePixelCount } = coverageShares(px, { min: 0, max: 100 }, ['#000000', '#FFFFFF']);
    expect(shares[0]).toBeCloseTo(1 / 3, 10);
    expect(shares[1]).toBeCloseTo(2 / 3, 10);
    expect(inRangePixelCount).toBe(300 * 50);
  });

  it('the six stripe colors → 1/6 each', () => {
    for (const s of coverageShares(px, { min: 0, max: 100 }, STRIPES).shares) expect(s).toBeCloseTo(1 / 6, 10);
  });

  // A14 lists this vector on stripes, but stripes' black stripe (value 0) is inside 0–10; with no in-range
  // pixels it holds for an image whose values are all above 10 (near-duplicates blues: 51–58). Logged.
  it('empty range → zeros', () => {
    const blues: RgbaImage = { width: 2, height: 1, data: new Uint8ClampedArray([0x30, 0x60, 0xc0, 255, 0xe0, 0x20, 0x20, 255]) };
    expect(coverageShares(toLabPixels(blues), { min: 0, max: 10 }, ['#3060C0', '#E02020'])).toEqual({ shares: [0, 0], inRangePixelCount: 0 });
  });

  it('labelMap assigns nearest indexes and marks out-of-range pixels', () => {
    const labels = labelMap(stripes(), { min: 40, max: 100 }, ['#000000', '#FFFFFF']);
    expect(labels.length).toBe(600 * 100);
    expect(labels[50]).toBe(NO_LABEL);                              // black stripe: value 0, out of range
    expect(labels[150]).toBe(1);                                    // white
    expect(labels[450]).toBe(0);                                    // blue (value 45) → black is nearer
  });

  it('labelMap skips transparent pixels', () => {
    const img: RgbaImage = { width: 2, height: 1, data: new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 255]) };
    expect(Array.from(labelMap(img, { min: 0, max: 100 }, ['#FF0000']))).toEqual([NO_LABEL, 0]);
  });
});
