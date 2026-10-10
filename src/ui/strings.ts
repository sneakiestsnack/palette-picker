// All user-visible text (Appendix D §D8). Grows phase by phase.
import type { ErrorKey, ToastMessage } from '../state/appState';

export const STRINGS = {
  APP_TITLE: 'Palette Picker',
  EMPTY_DESKTOP: 'Drop an image here, paste with Ctrl+V, or browse.',
  EMPTY_PHONE: 'Pick a photo or take a new one. Everything stays on your device.',
  CHOOSE_PHOTO: 'Choose photo',
  TAKE_PHOTO: 'Take photo',
  SAVE_IMAGE: 'Save image',
  BROWSE: 'Browse…',
  LOADING: 'Loading…',
  CONTROLS: 'Controls',
  PALETTE: 'Palette',
  EXPORT: 'Export',
  COLORS: 'Colors',
  VARIETY: 'Variety',
  VARIETY_CAPTIONS: ['Common', 'Distinct'] as const,
  HUE_WEIGHT: 'Hue weight',
  HUE_WEIGHT_CAPTIONS: ['Value & saturation', 'Hue too'] as const,
  VALUE_RANGE: 'Value range',
  RANGE_THUMBS: ['Minimum value', 'Maximum value'] as const,
  COPY_ALL: 'Copy all',
  COPY_FAILED: "Couldn't copy automatically. Select the codes below and copy them.",
  CLOSE: 'Close',
  NO_PIXELS: 'No part of the image falls in this value range.',
  WORKING: 'Working…',
  PALETTE_EMPTY: 'Load an image to make a palette.',
  OUT_OF_RANGE: 'Out-of-range',
  OVERLAY_SETTINGS: 'Overlay settings',
  OVERLAY_STYLE: 'Style',
  OVERLAY_TINT: 'Tint',
  OVERLAY_DIM: 'Dim',
  OVERLAY_DARK: 'Darker than range',
  OVERLAY_LIGHT: 'Lighter than range',
  OVERLAY_OPACITY: 'Opacity',
  DOWNLOAD_ACO: 'Download .aco',
  DOWNLOAD_PNG: 'Download PNG card',
} as const;

export const ERRORS: Record<ErrorKey, string> = {
  ERR_NOT_IMAGE: "That file isn't an image this app can read. Try JPEG, PNG, WebP or GIF.",
  ERR_HEIC: "This browser can't open HEIC photos. Try Safari, or save the photo as JPEG first.",
  ERR_DECODE: "Couldn't read this image. It may be damaged or in an unsupported format.",
  ERR_TOO_LARGE: 'This image is too large (the limit is 80 megapixels or 100 MB).',
  ERR_DROPPED_URL: 'That was a link, not an image file. Save the image first, or right-click it, choose Copy image, and paste here.',
  ERR_ENGINE: 'Something went wrong while making the palette. Try moving a slider or loading the image again.',
};

export function shortfallText(n: number): string {
  return n === 1
    ? 'Only 1 clearly different color in this value range.'
    : `Only ${n} clearly different colors in this value range.`;
}

export const copyLabel = (hex: string) => `Copy ${hex}`;
export const rangeText = (min: number, max: number) => `${min} – ${max}`;

export function toastText(m: ToastMessage): string {
  switch (m.kind) {
    case 'copiedOne':
      return `Copied ${m.hex}`;
    case 'copiedAll':
      return `Copied ${m.n} colors`;
    case 'error':
      return ERRORS[m.key];
  }
}

export function imageSizeLabel(width: number, height: number, originalWidth: number, originalHeight: number): string {
  const orig = `${originalWidth} × ${originalHeight}`;
  return width === originalWidth && height === originalHeight ? orig : `${orig} (shown at ${width} × ${height})`;
}
