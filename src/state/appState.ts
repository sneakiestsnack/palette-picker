// App state (blueprint §5.2). Fields arrive in the phase that introduces them.
import { DEFAULT_SETTINGS, type Controls, type Hex, type OverlaySettings, type PaletteEntry, type Settings } from '../core';
import type { DecodeErrorKey } from '../platform/decodeImage';

export type ErrorKey = DecodeErrorKey | 'ERR_DROPPED_URL' | 'ERR_ENGINE';

// Toasts are structured so state never depends on ui/strings.ts; the UI formats them.
export type ToastMessage =
  | { kind: 'copiedOne'; hex: Hex }
  | { kind: 'copiedAll'; n: number }
  | { kind: 'error'; key: ErrorKey };

export interface ImageInfo {
  imageId: number;
  name: string;
  width: number;                                            // display canvas size
  height: number;
  originalWidth: number;
  originalHeight: number;
  histogram: number[];                                      // 101 bins, opaque processing pixels
  processingWidth: number;
  processingHeight: number;
}

export interface AppState {
  // Phase 5
  image: ImageInfo | null;
  loading: boolean;
  error: ErrorKey | null;                                   // key into ui/strings.ts
  // Phase 6
  controls: Controls;
  palette: {
    entries: PaletteEntry[];                                // selection order (locked first)
    shortfall: boolean;
    pending: boolean;                                       // an extraction is in flight
    extractionRequest: number;                              // bump to request extraction
    appliedRequest: number;                                 // extractionRequest of the last applied result
  };
  toast: null | { id: number; message: ToastMessage; undo?: boolean };
  // Phase 7
  overlay: OverlaySettings;
}

export function createInitialState(settings: Settings = DEFAULT_SETTINGS): AppState {
  return {
    image: null,
    loading: false,
    error: null,
    controls: settings.controls,
    palette: { entries: [], shortfall: false, pending: false, extractionRequest: 0, appliedRequest: 0 },
    toast: null,
    overlay: settings.overlay,
  };
}

export const initialState: AppState = createInitialState();

// "Settled" (Appendix C §C3): no image, or the latest requested extraction has been applied.
export function isSettled(s: AppState): boolean {
  return s.image === null || (!s.palette.pending && s.palette.appliedRequest === s.palette.extractionRequest);
}
