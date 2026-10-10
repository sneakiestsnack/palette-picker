// Photoshop swatches (.aco), big-endian, version 1 + version 2 sections (A23).
import { hexToRgb8 } from '../color';
import type { Hex } from '../types';

export const ACO_MIME = 'application/octet-stream';

// Colors in display order; each swatch is named after its hex code (with '#').
export function aco(hexes: readonly Hex[]): Uint8Array {
  const n = hexes.length;
  const size = 4 + n * 10 + 4 + hexes.reduce((s, h) => s + 10 + 4 + (h.length + 1) * 2, 0);
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let o = 0;
  const u16 = (v: number) => { view.setUint16(o, v); o += 2; };
  const u32 = (v: number) => { view.setUint32(o, v); o += 4; };
  const color = (hex: Hex) => {
    const [r, g, b] = hexToRgb8(hex);
    u16(0);                                                  // color space: RGB
    u16(r * 257);
    u16(g * 257);
    u16(b * 257);
    u16(0);
  };

  u16(1);
  u16(n);
  for (const h of hexes) color(h);

  u16(2);
  u16(n);
  for (const h of hexes) {
    color(h);
    u32(h.length + 1);                                       // UTF-16 code units incl. terminator
    for (let i = 0; i < h.length; i++) u16(h.charCodeAt(i));
    u16(0);
  }
  return out;
}
