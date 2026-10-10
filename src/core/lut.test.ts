import { describe, expect, it } from 'vitest';
import { applyLut, highlightLut, overlayLut, packRgba } from './lut';
import { OVERLAY_DEFAULT } from './tuning';

describe('A15 LUTs', () => {
  it('packRgba', () => {
    expect(packRgba(255, 0, 0, 255)).toBe(0xff0000ff);
  });

  it('tint overlay, range 40–60, defaults', () => {
    const lut = overlayLut({ min: 40, max: 60 }, OVERLAY_DEFAULT);
    expect(lut[39]).toBe(packRgba(0x1e, 0x5b, 0xff, 153));
    expect(lut[40]).toBe(0);
    expect(lut[60]).toBe(0);
    expect(lut[61]).toBe(packRgba(0xff, 0x1e, 0xc8, 153));
    expect(lut[255]).toBe(0);
  });

  it('dim overlay', () => {
    const lut = overlayLut({ min: 40, max: 60 }, { ...OVERLAY_DEFAULT, mode: 'dim' });
    expect(lut[39]).toBe(packRgba(0x16, 0x16, 0x16, 153));
    expect(lut[255]).toBe(0);
  });

  it('applyLut maps each byte', () => {
    const lut = new Uint32Array(256);
    lut[1] = 7;
    lut[255] = 9;
    const out = new Uint32Array(3);
    applyLut(new Uint8Array([1, 0, 255]), lut, out);
    expect(Array.from(out)).toEqual([7, 0, 9]);
  });
});

describe('A15 highlight LUT', () => {
  it('selected index is clear; everything else, including 255, is dimmed', () => {
    const lut = highlightLut(2);
    expect(lut[2]).toBe(0);
    expect(lut[0]).toBe(packRgba(0, 0, 0, 191));
    expect(lut[255]).toBe(packRgba(0, 0, 0, 191));
  });
});
