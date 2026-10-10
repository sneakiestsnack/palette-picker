// Worker protocol (Appendix C §C1). Phase 13: coverage + labelMap. getProcessing arrives in Phase 16.
import type { ExtractParams, ExtractResult, Hex, RgbaImage, ValueRange } from './types';

export interface RgbaMsg { width: number; height: number; buffer: ArrayBuffer }   // RGBA bytes; always transferred
export interface RgbaLikeMap { width: number; height: number; buffer: ArrayBuffer }   // Uint8 value map, 1 byte/pixel

export type Req =
  | { kind: 'ping'; reqId: number }
  | { kind: 'load'; reqId: number; imageId: number; display: RgbaMsg; processing?: RgbaMsg }
  | { kind: 'extract'; reqId: number; imageId: number; params: ExtractParams; reroll?: { currentPicks: number[] } }
  | { kind: 'coverage'; reqId: number; imageId: number; palette: Hex[]; valueRange: ValueRange }
  | { kind: 'labelMap'; reqId: number; imageId: number; palette: Hex[]; valueRange: ValueRange };

export type Res =
  | { kind: 'pong'; reqId: number }
  | { kind: 'loaded'; reqId: number; imageId: number; valueMap: RgbaLikeMap; histogram: number[];
      processing: { width: number; height: number } }
  | { kind: 'extracted'; reqId: number; imageId: number; result: ExtractResult; excluded: number[] }
  | { kind: 'coverage'; reqId: number; imageId: number; palette: Hex[]; shares: number[]; inRangePixelCount: number }
  | { kind: 'labelMap'; reqId: number; imageId: number; palette: Hex[]; width: number; height: number; buffer: ArrayBuffer }
  | { kind: 'error'; reqId: number; imageId?: number; message: string };

export const STALE_IMAGE = 'stale-image';

export function toRgbaMsg(img: RgbaImage): RgbaMsg {
  const d = img.data;
  // Transfer needs a buffer holding exactly these bytes; copy if the view is a slice of a larger buffer.
  const buffer = d.byteOffset === 0 && d.byteLength === d.buffer.byteLength
    ? (d.buffer as ArrayBuffer)
    : (d.slice().buffer as ArrayBuffer);
  return { width: img.width, height: img.height, buffer };
}

export function fromRgbaMsg(m: RgbaMsg): RgbaImage {
  return { width: m.width, height: m.height, data: new Uint8ClampedArray(m.buffer) };
}
