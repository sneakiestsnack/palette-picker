import { describe, expect, it } from 'vitest';
import type { ExtractResult } from '../core';
import { actions } from './actions';
import { initialState, isCoverageSettled, isSettled, type AppState, type ImageInfo } from './appState';
import { reducer } from './reducer';

const info = (imageId: number): ImageInfo => ({
  imageId, name: `img${imageId}.png`, width: 600, height: 100, originalWidth: 600, originalHeight: 100,
  histogram: new Array(101).fill(0), processingWidth: 300, processingHeight: 50,
});

const result = (hexes: string[], shortfall = false): ExtractResult => ({
  picks: hexes.map((hex, candidateIndex) => ({ hex, candidateIndex })),
  shortfall,
  inRangePixelCount: 100,
  candidateCount: hexes.length,
});

const run = (s: AppState, ...as: Parameters<typeof reducer>[1][]) => as.reduce(reducer, s);

describe('reducer: image loading', () => {
  it('imageLoadStarted → loading, error cleared', () => {
    const s = reducer({ ...initialState, error: 'ERR_DECODE' }, actions.imageLoadStarted('a.png'));
    expect(s.loading).toBe(true);
    expect(s.error).toBeNull();
  });

  it('imageLoaded → ready and extractionRequest incremented', () => {
    const s = run(initialState, actions.imageLoadStarted('a.png'), actions.imageLoaded(info(1)));
    expect(s.loading).toBe(false);
    expect(s.image).toEqual(info(1));
    expect(s.palette.extractionRequest).toBe(initialState.palette.extractionRequest + 1);
  });

  it('imageLoadFailed → error, previous image kept', () => {
    const s = run(initialState, actions.imageLoaded(info(1)), actions.imageLoadStarted('bad.txt'), actions.imageLoadFailed('ERR_NOT_IMAGE'));
    expect(s.loading).toBe(false);
    expect(s.error).toBe('ERR_NOT_IMAGE');
    expect(s.image).toEqual(info(1));
  });
});

describe('reducer: controls and extraction', () => {
  it('controlsChanged merges, clamps size and bumps extractionRequest', () => {
    const s = run(initialState, actions.controlsChanged({ size: 40, variety: 10 }));
    expect(s.controls.size).toBe(16);
    expect(s.controls.variety).toBe(10);
    expect(s.palette.extractionRequest).toBe(initialState.palette.extractionRequest + 1);
  });

  it('a stale result still applies, but settled only when it matches', () => {
    let s = run(initialState, actions.imageLoaded(info(1)), actions.extractionStarted(1));
    s = run(s, actions.controlsChanged({ variety: 0 }), actions.extractionStarted(2));
    expect(s.palette.extractionRequest).toBe(2);

    s = reducer(s, actions.extractionSucceeded(result(['#000000', '#FFFFFF']), [], 1));
    expect(s.palette.entries.map((e) => e.hex)).toEqual(['#000000', '#FFFFFF']);
    expect(s.palette.appliedRequest).toBe(1);
    expect(s.palette.pending).toBe(true);
    expect(isSettled(s)).toBe(false);

    s = reducer(s, actions.extractionSucceeded(result(['#FF0000'], true), [], 2));
    expect(s.palette.entries.map((e) => e.hex)).toEqual(['#FF0000']);
    expect(s.palette.shortfall).toBe(true);
    expect(s.palette.pending).toBe(false);
    expect(isSettled(s)).toBe(true);
  });

  it('entries are extracted, unlocked, truncated to size', () => {
    let s = run(initialState, actions.controlsChanged({ size: 2 }));
    s = reducer(s, actions.extractionSucceeded(result(['#000000', '#FFFFFF', '#FF0000']), [], s.palette.extractionRequest));
    expect(s.palette.entries).toEqual([
      { hex: '#000000', locked: false, origin: 'extracted', candidateIndex: 0 },
      { hex: '#FFFFFF', locked: false, origin: 'extracted', candidateIndex: 1 },
    ]);
  });

  it('extractionFailed clears pending, records the request and shows ERR_ENGINE', () => {
    const s = run(initialState, actions.imageLoaded(info(1)), actions.extractionStarted(1), actions.extractionFailed('boom', 1));
    expect(s.palette.pending).toBe(false);
    expect(s.palette.appliedRequest).toBe(1);
    expect(s.toast?.message).toEqual({ kind: 'error', key: 'ERR_ENGINE' });
    expect(isSettled(s)).toBe(true);
  });

  it('settled with no image', () => {
    expect(isSettled(initialState)).toBe(true);
  });
});

describe('reducer: phone controls', () => {
  it('phoneControlsToggled flips the flag (open by default)', () => {
    expect(initialState.phoneControlsOpen).toBe(true);
    expect(reducer(initialState, actions.phoneControlsToggled()).phoneControlsOpen).toBe(false);
  });
});

describe('reducer: toast', () => {
  it('shows and hides by id only', () => {
    let s = reducer(initialState, actions.toastShown({ kind: 'copiedOne', hex: '#000000' }));
    const id = s.toast!.id;
    expect(reducer(s, actions.toastHidden(id + 999)).toast).not.toBeNull();
    s = reducer(s, actions.toastHidden(id));
    expect(s.toast).toBeNull();
  });
});

describe('reducer: locks and re-roll', () => {
  const withPalette = (hexes: string[]) => {
    let s = run(initialState, actions.imageLoaded(info(1)), actions.controlsChanged({ size: hexes.length }));
    s = reducer(s, actions.extractionSucceeded(result(hexes), [], s.palette.extractionRequest));
    return s;
  };

  it('lockToggled does not request an extraction and keeps locked first', () => {
    const s0 = withPalette(['#000000', '#0000FF', '#FF0000']);
    const s = reducer(s0, actions.lockToggled('#0000FF'));
    expect(s.palette.extractionRequest).toBe(s0.palette.extractionRequest);
    expect(s.palette.entries.map((e) => [e.hex, e.locked])).toEqual([['#0000FF', true], ['#000000', false], ['#FF0000', false]]);
  });

  it('the size cannot go below the number of locked colors', () => {
    let s = withPalette(['#000000', '#0000FF', '#FF0000']);
    s = run(s, actions.lockToggled('#000000'), actions.lockToggled('#0000FF'), actions.lockToggled('#FF0000'));
    s = reducer(s, actions.controlsChanged({ size: 2 }));
    expect(s.controls.size).toBe(3);
  });

  it('controlsChanged and imageLoaded reset excluded', () => {
    let s = withPalette(['#000000', '#0000FF']);
    s = reducer(s, actions.extractionSucceeded(result(['#FF0000', '#FFFFFF']), [0, 1], s.palette.extractionRequest));
    expect(s.excluded).toEqual([0, 1]);
    expect(reducer(s, actions.controlsChanged({ variety: 10 })).excluded).toEqual([]);
    expect(reducer(s, actions.imageLoaded(info(2))).excluded).toEqual([]);
  });

  it('rerollRequested bumps extractionRequest and marks it as a re-roll', () => {
    const s0 = withPalette(['#000000', '#0000FF']);
    const s = reducer(s0, actions.rerollRequested());
    expect(s.palette.extractionRequest).toBe(s0.palette.extractionRequest + 1);
    expect(s.palette.rerollFor).toBe(s.palette.extractionRequest);
  });

  it('entryRemoved re-extracts only when the palette falls below its size', () => {
    let s = withPalette(['#000000', '#0000FF']);
    s = reducer(s, actions.lockToggled('#0000FF'));
    const before = s.palette.extractionRequest;
    s = reducer(s, actions.entryRemoved('#0000FF'));
    expect(s.palette.entries.map((e) => e.hex)).toEqual(['#000000']);
    expect(s.controls.size).toBe(2);
    expect(s.palette.extractionRequest).toBe(before + 1);
  });
});

describe('reducer: eyedropper', () => {
  it('colorPicked adds a locked entry without re-extracting; a repeat is a duplicate toast', () => {
    let s = run(initialState, actions.imageLoaded(info(1)), actions.controlsChanged({ size: 2 }));
    s = reducer(s, actions.extractionSucceeded(result(['#000000', '#FFFFFF']), [], s.palette.extractionRequest));
    const before = s.palette.extractionRequest;
    s = reducer(s, actions.colorPicked('#FFFF00'));
    expect(s.palette.entries.map((e) => [e.hex, e.locked, e.origin])).toEqual([
      ['#FFFF00', true, 'eyedropper'], ['#000000', false, 'extracted'], ['#FFFFFF', false, 'extracted'],
    ]);
    expect(s.controls.size).toBe(3);
    expect(s.palette.extractionRequest).toBe(before);
    s = reducer(s, actions.colorPicked('#FFFF00'));
    expect(s.toast?.message).toEqual({ kind: 'eyedropperDup' });
    expect(s.palette.entries.length).toBe(3);
  });

  it('eyedropperToggled flips or sets', () => {
    const on = reducer(initialState, actions.eyedropperToggled());
    expect(on.eyedropper).toBe(true);
    expect(reducer(on, actions.eyedropperToggled(false)).eyedropper).toBe(false);
  });
});

describe('reducer: selection and coverage', () => {
  const twoColor = () => {
    let s = run(initialState, actions.imageLoaded(info(1)), actions.controlsChanged({ size: 2 }));
    return reducer(s, actions.extractionSucceeded(result(['#000000', '#FFFFFF']), [], s.palette.extractionRequest));
  };

  it('coverageReceived stores only coverage for the current entries', () => {
    const s = twoColor();
    expect(reducer(s, actions.coverageReceived(['#FFFFFF', '#000000'], [0.5, 0.5])).coverage).toBeNull();
    const ok = reducer(s, actions.coverageReceived(['#000000', '#FFFFFF'], [1 / 3, 2 / 3]));
    expect(ok.coverage).toEqual({ palette: ['#000000', '#FFFFFF'], shares: [1 / 3, 2 / 3] });
    expect(isCoverageSettled(ok)).toBe(true);
  });

  it('selection is set and cleared; a new image clears selection and coverage', () => {
    let s = reducer(twoColor(), actions.swatchSelected('#000000'));
    expect(s.selectedHex).toBe('#000000');
    s = reducer(s, actions.coverageReceived(['#000000', '#FFFFFF'], [0.5, 0.5]));
    s = reducer(s, actions.imageLoaded(info(2)));
    expect(s.selectedHex).toBeNull();
    expect(s.coverage).toBeNull();
  });

  it('showWhere defaults on and toggles', () => {
    expect(initialState.showWhere).toBe(true);
    expect(reducer(initialState, actions.showWhereToggled()).showWhere).toBe(false);
  });
});
