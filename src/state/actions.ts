// Reducer actions (Appendix C §C3).
import type { ErrorKey, ImageInfo } from './appState';

export type Action =
  | { type: 'imageLoadStarted'; name: string }
  | { type: 'imageLoaded'; info: ImageInfo }
  | { type: 'imageLoadFailed'; error: ErrorKey };

export const actions = {
  imageLoadStarted: (name: string): Action => ({ type: 'imageLoadStarted', name }),
  imageLoaded: (info: ImageInfo): Action => ({ type: 'imageLoaded', info }),
  imageLoadFailed: (error: ErrorKey): Action => ({ type: 'imageLoadFailed', error }),
};
