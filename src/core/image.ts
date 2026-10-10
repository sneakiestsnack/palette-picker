// Resizing (A5) and pixel lists / value map / histogram (A6).
import { SRGB_TO_LINEAR, to8, valueOfL } from './color';
import { ALPHA_OPAQUE_MIN, HISTOGRAM_BINS } from './tuning';
import type { LabPixels, RgbaImage, ValueRange } from './types';

export const TRANSPARENT_VALUE = 255;

export function scaledSize(w: number, h: number, maxEdge: number): [width: number, height: number] {
  const s = Math.min(1, maxEdge / Math.max(w, h));
  return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
}

// Box filter in linear light. Never upscales, so the integer ranges partition the source exactly.
export function downsampleBox(src: RgbaImage, maxEdge: number): RgbaImage {
  const W = src.width;
  const H = src.height;
  const [dw, dh] = scaledSize(W, H, maxEdge);
  if (dw === W && dh === H) return { width: W, height: H, data: new Uint8ClampedArray(src.data) };
  const s = src.data;
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let dy = 0; dy < dh; dy++) {
    const y0 = Math.floor((dy * H) / dh);
    const y1 = Math.floor(((dy + 1) * H) / dh);
    for (let dx = 0; dx < dw; dx++) {
      const x0 = Math.floor((dx * W) / dw);
      const x1 = Math.floor(((dx + 1) * W) / dw);
      const n = (x1 - x0) * (y1 - y0);
      let k = 0;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      for (let y = y0; y < y1; y++) {
        let p = (y * W + x0) * 4;
        for (let x = x0; x < x1; x++, p += 4) {
          if (s[p + 3]! < ALPHA_OPAQUE_MIN) continue;
          k++;
          sr += SRGB_TO_LINEAR[s[p]!]!;
          sg += SRGB_TO_LINEAR[s[p + 1]!]!;
          sb += SRGB_TO_LINEAR[s[p + 2]!]!;
        }
      }
      const o = (dy * dw + dx) * 4;
      if (2 * k >= n) {
        out[o] = to8(sr / k);
        out[o + 1] = to8(sg / k);
        out[o + 2] = to8(sb / k);
        out[o + 3] = 255;
      }
      // else stays (0,0,0,0)
    }
  }
  return { width: dw, height: dh, data: out };
}

// OKLab L of an 8-bit sRGB pixel, matrices inlined (A2), no allocation.
function pixelL(r8: number, g8: number, b8: number): number {
  const r = SRGB_TO_LINEAR[r8]!;
  const g = SRGB_TO_LINEAR[g8]!;
  const b = SRGB_TO_LINEAR[b8]!;
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
}

export function toLabPixels(img: RgbaImage): LabPixels {
  const d = img.data;
  const total = img.width * img.height;
  let count = 0;
  for (let i = 0; i < total; i++) if (d[i * 4 + 3]! >= ALPHA_OPAQUE_MIN) count++;
  const lab = new Float64Array(count * 3);
  const value = new Uint8Array(count);
  let j = 0;
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    if (d[p + 3]! < ALPHA_OPAQUE_MIN) continue;
    const r = SRGB_TO_LINEAR[d[p]!]!;
    const g = SRGB_TO_LINEAR[d[p + 1]!]!;
    const b = SRGB_TO_LINEAR[d[p + 2]!]!;
    const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
    lab[j * 3] = L;
    lab[j * 3 + 1] = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
    lab[j * 3 + 2] = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
    value[j] = valueOfL(L);
    j++;
  }
  return { count, lab, value };
}

export function valueMap(img: RgbaImage): Uint8Array {
  const d = img.data;
  const total = img.width * img.height;
  const out = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    out[i] = d[p + 3]! < ALPHA_OPAQUE_MIN ? TRANSPARENT_VALUE : valueOfL(pixelL(d[p]!, d[p + 1]!, d[p + 2]!));
  }
  return out;
}

export function valueHistogram(px: LabPixels): number[] {
  const hist = new Array<number>(HISTOGRAM_BINS).fill(0);
  for (let i = 0; i < px.count; i++) hist[px.value[i]!]!++;
  return hist;
}

export function inRangeIndices(px: LabPixels, range: ValueRange): Int32Array {
  let n = 0;
  for (let i = 0; i < px.count; i++) {
    const v = px.value[i]!;
    if (v >= range.min && v <= range.max) n++;
  }
  const out = new Int32Array(n);
  let j = 0;
  for (let i = 0; i < px.count; i++) {
    const v = px.value[i]!;
    if (v >= range.min && v <= range.max) out[j++] = i;
  }
  return out;
}
