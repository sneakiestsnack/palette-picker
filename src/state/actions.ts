// Reducer actions (Appendix C §C3).
import type { Controls, ExtractResult, OverlaySettings } from '../core';
import type { ErrorKey, ImageInfo, ToastMessage } from './appState';

export type Action =
  | { type: 'imageLoadStarted'; name: string }
  | { type: 'imageLoaded'; info: ImageInfo }
  | { type: 'imageLoadFailed'; error: ErrorKey }
  | { type: 'controlsChanged'; partial: Partial<Controls> }
  | { type: 'extractionStarted'; request: number }
  | { type: 'extractionSucceeded'; result: ExtractResult; excluded: number[]; request: number }
  | { type: 'extractionFailed'; message: string; request: number }
  | { type: 'toastShown'; message: ToastMessage; undo?: boolean }
  | { type: 'toastHidden'; id: number }
  | { type: 'overlayChanged'; partial: Partial<OverlaySettings> }
  | { type: 'phoneControlsToggled' };

export const actions = {
  imageLoadStarted: (name: string): Action => ({ type: 'imageLoadStarted', name }),
  imageLoaded: (info: ImageInfo): Action => ({ type: 'imageLoaded', info }),
  imageLoadFailed: (error: ErrorKey): Action => ({ type: 'imageLoadFailed', error }),
  controlsChanged: (partial: Partial<Controls>): Action => ({ type: 'controlsChanged', partial }),
  extractionStarted: (request: number): Action => ({ type: 'extractionStarted', request }),
  extractionSucceeded: (result: ExtractResult, excluded: number[], request: number): Action =>
    ({ type: 'extractionSucceeded', result, excluded, request }),
  extractionFailed: (message: string, request: number): Action => ({ type: 'extractionFailed', message, request }),
  toastShown: (message: ToastMessage, undo?: boolean): Action => ({ type: 'toastShown', message, undo }),
  toastHidden: (id: number): Action => ({ type: 'toastHidden', id }),
  overlayChanged: (partial: Partial<OverlaySettings>): Action => ({ type: 'overlayChanged', partial }),
  phoneControlsToggled: (): Action => ({ type: 'phoneControlsToggled' }),
};
