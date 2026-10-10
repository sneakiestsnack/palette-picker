// Decode pipeline (Appendix D §D5): file → display-size canvas + RGBA pixels.
import { scaledSize } from '../core/image';
import { DISPLAY_MAX_EDGE, MAX_INPUT_BYTES, MAX_INPUT_PIXELS } from '../core/tuning';
import type { RgbaImage } from '../core/types';

export type DecodeErrorKey = 'ERR_NOT_IMAGE' | 'ERR_HEIC' | 'ERR_DECODE' | 'ERR_TOO_LARGE';

export class DecodeError extends Error {
  constructor(readonly key: DecodeErrorKey) {
    super(key);
  }
}

export interface DecodedImage {
  canvas: HTMLCanvasElement;
  rgba: RgbaImage;
  originalWidth: number;
  originalHeight: number;
}

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif', 'image/bmp']);
const EXT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  heic: 'image/heic', heif: 'image/heif', avif: 'image/avif', bmp: 'image/bmp',
};

function effectiveType(file: Blob, name: string): string | null {
  const type = file.type.toLowerCase();
  if (type) return TYPES.has(type) ? type : null;
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
  return (ext && EXT_TYPES[ext]) || null;
}

export async function decodeImage(file: Blob, name: string): Promise<DecodedImage> {
  if (file.size === 0) throw new DecodeError('ERR_NOT_IMAGE');
  if (file.size > MAX_INPUT_BYTES) throw new DecodeError('ERR_TOO_LARGE');
  const type = effectiveType(file, name);
  if (!type) throw new DecodeError('ERR_NOT_IMAGE');

  let source: CanvasImageSource;
  let w: number;
  let h: number;
  let bitmap: ImageBitmap | null = null;
  let url: string | null = null;
  try {
    if (type === 'image/gif') {
      // First frame of an animation.
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        throw new DecodeError('ERR_DECODE');
      }
      source = bitmap;
      w = bitmap.width;
      h = bitmap.height;
    } else {
      // <img> applies EXIF orientation; never rotate manually (Appendix G #10).
      url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } catch {
        throw new DecodeError(type === 'image/heic' || type === 'image/heif' ? 'ERR_HEIC' : 'ERR_DECODE');
      }
      source = img;
      w = img.naturalWidth;
      h = img.naturalHeight;
    }
    if (w === 0 || h === 0) throw new DecodeError('ERR_DECODE');
    if (w * h > MAX_INPUT_PIXELS) throw new DecodeError('ERR_TOO_LARGE');

    // Never create a full-size canvas (iOS canvas limits, Appendix G #9).
    const [dw, dh] = scaledSize(w, h, DISPLAY_MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new DecodeError('ERR_DECODE');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, dw, dh);
    const data = ctx.getImageData(0, 0, dw, dh).data;
    // Own buffer: it is transferred to the worker, the canvas keeps its own pixels.
    const rgba: RgbaImage = { width: dw, height: dh, data: new Uint8ClampedArray(data) };
    return { canvas, rgba, originalWidth: w, originalHeight: h };
  } finally {
    if (url) URL.revokeObjectURL(url);
    bitmap?.close();
  }
}
