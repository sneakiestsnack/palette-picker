import { describe, expect, it } from 'vitest';
import {
  SRGB_TO_LINEAR, formatHex, grayHexForValue, hexToLab, labToHex, labToLch, lchToLab,
  parseHex, rgb8ToLab, to8, valueOfHex, valueOfL,
} from './color';

describe('A1 sRGB transfer', () => {
  it('decode table endpoints and midpoint', () => {
    expect(SRGB_TO_LINEAR[0]).toBe(0);
    expect(SRGB_TO_LINEAR[255]).toBe(1);
    expect(SRGB_TO_LINEAR[128]).toBeCloseTo(0.215861, 5);
  });

  it('to8 encodes and clamps before scaling', () => {
    expect(to8(0.5)).toBe(188);
    expect(to8(1.2)).toBe(255);
    expect(to8(-0.1)).toBe(0);
  });

  it('round-trips every 8-bit value', () => {
    for (let v = 0; v < 256; v++) expect(to8(SRGB_TO_LINEAR[v]!)).toBe(v);
  });
});

describe('A2 OKLab', () => {
  const rows: [string, number, number, number][] = [
    ['#000000', 0, 0, 0],
    ['#FFFFFF', 1, 0, 0],
    ['#FF0000', 0.627955, 0.224863, 0.125846],
    ['#00FF00', 0.86644, -0.233888, 0.179498],
    ['#0000FF', 0.452014, -0.032457, -0.311528],
    ['#FFFF00', 0.967983, -0.071369, 0.19857],
    ['#808080', 0.599871, 0, 0],
    ['#FFBE98', 0.852111, 0.056533, 0.070913],
  ];

  it.each(rows)('hexToLab(%s)', (hex, L, a, b) => {
    const lab = hexToLab(hex);
    expect(lab[0]).toBeCloseTo(L, 4);
    expect(lab[1]).toBeCloseTo(a, 4);
    expect(lab[2]).toBeCloseTo(b, 4);
  });

  it.each(rows)('labToHex(hexToLab(%s)) round-trips', (hex) => {
    expect(labToHex(hexToLab(hex))).toBe(hex);
  });
});

describe('A3 value', () => {
  it.each([
    ['#000000', 0], ['#0000FF', 45], ['#808080', 60], ['#FF0000', 63],
    ['#FFBE98', 85], ['#00FF00', 87], ['#FFFF00', 97], ['#FFFFFF', 100],
  ] as const)('valueOfHex(%s) = %i', (hex, v) => {
    expect(valueOfHex(hex)).toBe(v);
  });

  it('HSV trap: saturated yellow reads lighter than saturated blue', () => {
    expect(valueOfHex('#FFFF00')).toBe(97);
    expect(valueOfHex('#0000FF')).toBe(45);
  });

  it('gradient fixture gray columns', () => {
    const expected: [number[], number][] = [
      [[68, 69, 70], 39], [[71, 72], 40], [[124, 125, 126], 59], [[127, 128, 129], 60], [[130, 131, 132], 61],
    ];
    for (const [grays, v] of expected) {
      for (const g of grays) expect(valueOfL(rgb8ToLab([g, g, g])[0]), `gray ${g}`).toBe(v);
    }
  });

  it('valueOfL clamps', () => {
    expect(valueOfL(-0.2)).toBe(0);
    expect(valueOfL(1.3)).toBe(100);
  });
});

describe('A3 hex', () => {
  it('formatHex zero-pads uppercase', () => {
    expect(formatHex(0, 15, 10)).toBe('#000F0A');
  });

  it('parseHex', () => {
    expect(parseHex('ffbe98')).toBe('#FFBE98');
    expect(parseHex(' #FFBE98 ')).toBe('#FFBE98');
    expect(parseHex('#FFF')).toBeNull();
    expect(parseHex('#GGGGGG')).toBeNull();
    expect(parseHex('FFBE98A')).toBeNull();
  });

  it('labToHex clips out-of-gamut colors', () => {
    expect(labToHex([1.05, 0, 0])).toBe('#FFFFFF');
    expect(labToHex([0.627955, 0.3, 0.125846])).toBe('#FF0000');
  });
});

describe('A3 OKLCH', () => {
  it.each([
    ['#FF0000', 0.628, 0.2577, 29.23],
    ['#00FF00', 0.8664, 0.2948, 142.5],
    ['#0000FF', 0.452, 0.3132, 264.05],
    ['#FFFF00', 0.968, 0.211, 109.77],
    ['#FF8000', 0.7319, 0.1858, 52.98],
    ['#3060C0', 0.5099, 0.1598, 262.3],
  ] as const)('labToLch(%s)', (hex, L, C, h) => {
    const lch = labToLch(hexToLab(hex));
    expect(lch[0]).toBeCloseTo(L, 3);
    expect(lch[1]).toBeCloseTo(C, 3);
    expect(Math.abs(lch[2] - h)).toBeLessThanOrEqual(0.01);
  });

  it('zero chroma has hue 0', () => {
    expect(labToLch([0.5, 0, 0])).toEqual([0.5, 0, 0]);
  });

  it('lchToLab inverts labToLch', () => {
    const lab = hexToLab('#3060C0');
    const back = lchToLab(labToLch(lab));
    for (let i = 0; i < 3; i++) expect(back[i]).toBeCloseTo(lab[i]!, 10);
  });
});

describe('A3 grays', () => {
  it.each([
    [0, '#000000'], [20, '#161616'], [45, '#555555'], [50, '#636363'],
    [60, '#808080'], [63, '#898989'], [100, '#FFFFFF'],
  ] as const)('grayHexForValue(%i) = %s', (v, hex) => {
    expect(grayHexForValue(v)).toBe(hex);
  });
});
