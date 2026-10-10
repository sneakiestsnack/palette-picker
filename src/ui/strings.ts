// All user-visible text (Appendix D §D8). Grows phase by phase.
import type { ErrorKey } from '../state/appState';

export const STRINGS = {
  APP_TITLE: 'Palette Picker',
  EMPTY_DESKTOP: 'Drop an image here, paste with Ctrl+V, or browse.',
  BROWSE: 'Browse…',
  LOADING: 'Loading…',
  CONTROLS: 'Controls',
  PALETTE: 'Palette',
  EXPORT: 'Export',
} as const;

export const ERRORS: Record<ErrorKey, string> = {
  ERR_NOT_IMAGE: "That file isn't an image this app can read. Try JPEG, PNG, WebP or GIF.",
  ERR_HEIC: "This browser can't open HEIC photos. Try Safari, or save the photo as JPEG first.",
  ERR_DECODE: "Couldn't read this image. It may be damaged or in an unsupported format.",
  ERR_TOO_LARGE: 'This image is too large (the limit is 80 megapixels or 100 MB).',
  ERR_DROPPED_URL: 'That was a link, not an image file. Save the image first, or right-click it, choose Copy image, and paste here.',
  ERR_ENGINE: 'Something went wrong while making the palette. Try moving a slider or loading the image again.',
};

export function imageSizeLabel(width: number, height: number, originalWidth: number, originalHeight: number): string {
  const orig = `${originalWidth} × ${originalHeight}`;
  return width === originalWidth && height === originalHeight ? orig : `${orig} (shown at ${width} × ${height})`;
}
