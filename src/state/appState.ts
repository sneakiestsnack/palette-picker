// App state (blueprint §5.2). Fields arrive in the phase that introduces them.
import type { DecodeErrorKey } from '../platform/decodeImage';

export type ErrorKey = DecodeErrorKey | 'ERR_DROPPED_URL' | 'ERR_ENGINE';

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
  palette: {
    extractionRequest: number;                              // bump to request extraction (Phase 6 adds the rest)
  };
}

export const initialState: AppState = {
  image: null,
  loading: false,
  error: null,
  palette: { extractionRequest: 0 },
};
