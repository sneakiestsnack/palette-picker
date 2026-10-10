// Lookup-table rendering (A15): value map (1 byte/pixel) → RGBA via a 256-entry Uint32 table.
// Phase 7: overlay. Gray / notan / highlight tables arrive with their phases.
import { grayHexForValue, hexToRgb8 } from './color';
import { OVERLAY_DIM_FACTOR } from './tuning';
import type { Hex, OverlaySettings, ValueRange } from './types';

// Little-endian: a Uint32 over RGBA bytes (checked at startup in the platform layer).
export function packRgba(r: number, g: number, b: number, a: number): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function packHex(hex: Hex, a: number): number {
  const [r, g, b] = hexToRgb8(hex);
  return packRgba(r, g, b, a);
}

export function applyLut(map: Uint8Array, lut: Uint32Array, out: Uint32Array): void {
  for (let i = 0; i < map.length; i++) out[i] = lut[map[i]!]!;
}

export function overlayLut(range: ValueRange, s: OverlaySettings): Uint32Array {
  const alpha = Math.round((s.opacity / 100) * 255);
  const lut = new Uint32Array(256);
  for (let v = 0; v <= 100; v++) {
    const below = v < range.min;
    if (!below && v <= range.max) continue;
    lut[v] = s.mode === 'tint'
      ? packHex(below ? s.darkTint : s.lightTint, alpha)
      : packHex(grayHexForValue(Math.round(v * OVERLAY_DIM_FACTOR)), alpha);
  }
  return lut;
}
