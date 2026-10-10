import { describe, expect, it } from 'vitest';
import type { ExtractResult } from '../core';
import { actions } from './actions';
import { initialState, isSettled, type AppState, type ImageInfo } from './appState';
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

describe('reducer: toast', () => {
  it('shows and hides by id only', () => {
    let s = reducer(initialState, actions.toastShown({ kind: 'copiedOne', hex: '#000000' }));
    const id = s.toast!.id;
    expect(reducer(s, actions.toastHidden(id + 999)).toast).not.toBeNull();
    s = reducer(s, actions.toastHidden(id));
    expect(s.toast).toBeNull();
  });
});
