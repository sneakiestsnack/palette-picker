// Pure reducer (Appendix C §C3).
import { PALETTE_SIZE_MAX, addPickedColor, mergeExtraction, removeEntry, sizeMin, toggleLock, type Controls } from '../core';
import type { Action } from './actions';
import type { AppState, ToastMessage } from './appState';

let toastSeq = 0;

function withToast(state: AppState, message: ToastMessage, undo?: boolean): AppState {
  return { ...state, toast: { id: ++toastSeq, message, ...(undo ? { undo } : {}) } };
}

function clampInt(x: number, lo: number, hi: number): number {
  const r = Math.round(x);
  return r < lo ? lo : r > hi ? hi : r;
}

// The size can't go below the number of locked colors (sizeMinimum).
function mergeControls(prev: Controls, partial: Partial<Controls>, sizeMinimum: number): Controls {
  const next = { ...prev, ...partial };
  const a = clampInt(next.valueRange.min, 0, 100);
  const b = clampInt(next.valueRange.max, 0, 100);
  return {
    size: clampInt(next.size, sizeMinimum, PALETTE_SIZE_MAX),
    variety: clampInt(next.variety, 0, 100),
    hueWeight: clampInt(next.hueWeight, 0, 100),
    valueRange: a <= b ? { min: a, max: b } : { min: b, max: a },
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'imageLoadStarted':
      return { ...state, loading: true, error: null };

    case 'imageLoaded':
      return {
        ...state,
        image: action.info,
        loading: false,
        error: null,
        excluded: [],
        palette: { ...state.palette, extractionRequest: state.palette.extractionRequest + 1 },
      };

    case 'imageLoadFailed':
      return { ...state, loading: false, error: action.error };

    case 'controlsChanged':
      return {
        ...state,
        controls: mergeControls(state.controls, action.partial, sizeMin(state.palette.entries)),
        excluded: [],
        palette: { ...state.palette, extractionRequest: state.palette.extractionRequest + 1 },
      };

    case 'extractionStarted':
      return { ...state, palette: { ...state.palette, pending: true } };

    // Results arrive in order, so even a stale one is applied (live updates while dragging);
    // the palette only counts as settled once the latest request's result is in.
    case 'extractionSucceeded': {
      const p = state.palette;
      return {
        ...state,
        excluded: action.excluded,
        palette: {
          ...p,
          entries: mergeExtraction(p.entries, action.result.picks, state.controls.size),
          shortfall: action.result.shortfall,
          appliedRequest: action.request,
          pending: action.request === p.extractionRequest ? false : p.pending,
        },
      };
    }

    case 'extractionFailed':
      return withToast(
        { ...state, palette: { ...state.palette, pending: false, appliedRequest: action.request } },
        { kind: 'error', key: 'ERR_ENGINE' },
      );

    case 'toastShown':
      return withToast(state, action.message, action.undo);

    case 'toastHidden':
      return state.toast?.id === action.id ? { ...state, toast: null } : state;

    case 'overlayChanged':
      return { ...state, overlay: { ...state.overlay, ...action.partial } };

    case 'phoneControlsToggled':
      return { ...state, phoneControlsOpen: !state.phoneControlsOpen };

    // Never re-extracts; only keeps the size at or above the locked count.
    case 'lockToggled': {
      const entries = toggleLock(state.palette.entries, action.hex);
      return {
        ...state,
        controls: { ...state.controls, size: Math.max(state.controls.size, sizeMin(entries)) },
        palette: { ...state.palette, entries },
      };
    }

    case 'entryRemoved': {
      const p = state.palette;
      const r = removeEntry(p.entries, state.controls.size, action.hex);
      return {
        ...state,
        controls: { ...state.controls, size: r.size },
        palette: { ...p, entries: r.entries, extractionRequest: p.extractionRequest + (r.needsExtraction ? 1 : 0) },
      };
    }

    case 'eyedropperToggled':
      return { ...state, eyedropper: action.on ?? !state.eyedropper };

    // A picked color is added locked; never re-extracts.
    case 'colorPicked': {
      const r = addPickedColor(state.palette.entries, state.controls.size, action.hex, action.origin);
      if (r.outcome === 'duplicate') return withToast(state, { kind: 'eyedropperDup' });
      if (r.outcome === 'full') return withToast(state, { kind: 'eyedropperFull' });
      return {
        ...state,
        controls: { ...state.controls, size: r.size },
        palette: { ...state.palette, entries: r.entries },
      };
    }

    case 'rerollRequested': {
      const request = state.palette.extractionRequest + 1;
      return { ...state, palette: { ...state.palette, extractionRequest: request, rerollFor: request } };
    }
  }
}
