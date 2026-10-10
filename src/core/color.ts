// sRGB transfer (A1), OKLab (A2), value / hex / OKLCH / grays (A3).
import type { Hex, Lab, Lch, Rgb8 } from './types';

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function decode8(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export const SRGB_TO_LINEAR: Float64Array = (() => {
  const t = new Float64Array(256);
  for (let i = 0; i < 256; i++) t[i] = decode8(i);
  return t;
})();

export function encodeSrgb(l: number): number {
  return l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055;
}

// Clamp BEFORE scaling: averaged colors can be slightly out of gamut.
export function to8(l: number): number {
  return Math.round(clamp01(encodeSrgb(l)) * 255);
}

export function linearToLab(r: number, g: number, b: number): Lab {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

// Returns unclamped linear sRGB; callers clamp when encoding.
export function labToLinear(lab: Lab): [r: number, g: number, b: number] {
  const [L, a, b] = lab;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

export function rgb8ToLab(rgb: Rgb8): Lab {
  return linearToLab(SRGB_TO_LINEAR[rgb[0]]!, SRGB_TO_LINEAR[rgb[1]]!, SRGB_TO_LINEAR[rgb[2]]!);
}

const HEX_DIGITS = '0123456789ABCDEF';

function byteHex(n: number): string {
  return HEX_DIGITS[n >> 4]! + HEX_DIGITS[n & 15]!;
}

export function formatHex(r: number, g: number, b: number): Hex {
  return '#' + byteHex(r) + byteHex(g) + byteHex(b);
}

export function parseHex(s: string): Hex | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s.trim());
  return m ? '#' + m[1]!.toUpperCase() : null;
}

// Expects a valid Hex (from formatHex/parseHex).
export function hexToRgb8(hex: Hex): Rgb8 {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexToLab(hex: Hex): Lab {
  return rgb8ToLab(hexToRgb8(hex));
}

export function labToHex(lab: Lab): Hex {
  const [r, g, b] = labToLinear(lab);
  return formatHex(to8(r), to8(g), to8(b));
}

export function valueOfL(L: number): number {
  return Math.min(100, Math.max(0, Math.round(L * 100)));
}

export function valueOfHex(hex: Hex): number {
  return valueOfL(hexToLab(hex)[0]);
}

export function labToLch(lab: Lab): Lch {
  const [L, a, b] = lab;
  const C = Math.hypot(a, b);
  if (C === 0) return [L, 0, 0];
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  if (h >= 360) h -= 360;
  return [L, C, h];
}

export function lchToLab(lch: Lch): Lab {
  const [L, C, h] = lch;
  const rad = (h * Math.PI) / 180;
  return [L, C * Math.cos(rad), C * Math.sin(rad)];
}

// A neutral with OKLab L = v/100 has linear luminance L³.
export function grayHexForValue(v: number): Hex {
  const g = to8((v / 100) ** 3);
  return formatHex(g, g, g);
}
