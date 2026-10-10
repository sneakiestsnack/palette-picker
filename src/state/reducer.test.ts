import { describe, expect, it } from 'vitest';
import { actions } from './actions';
import { initialState, type ImageInfo } from './appState';
import { reducer } from './reducer';

const info = (imageId: number): ImageInfo => ({
  imageId, name: `img${imageId}.png`, width: 600, height: 100, originalWidth: 600, originalHeight: 100,
  histogram: new Array(101).fill(0), processingWidth: 300, processingHeight: 50,
});

describe('reducer: image loading', () => {
  it('imageLoadStarted → loading, error cleared', () => {
    const s = reducer({ ...initialState, error: 'ERR_DECODE' }, actions.imageLoadStarted('a.png'));
    expect(s.loading).toBe(true);
    expect(s.error).toBeNull();
  });

  it('imageLoaded → ready and extractionRequest incremented', () => {
    const s = reducer(reducer(initialState, actions.imageLoadStarted('a.png')), actions.imageLoaded(info(1)));
    expect(s.loading).toBe(false);
    expect(s.image).toEqual(info(1));
    expect(s.palette.extractionRequest).toBe(initialState.palette.extractionRequest + 1);
  });

  it('imageLoadFailed → error, previous image kept', () => {
    let s = reducer(initialState, actions.imageLoaded(info(1)));
    s = reducer(s, actions.imageLoadStarted('bad.txt'));
    s = reducer(s, actions.imageLoadFailed('ERR_NOT_IMAGE'));
    expect(s.loading).toBe(false);
    expect(s.error).toBe('ERR_NOT_IMAGE');
    expect(s.image).toEqual(info(1));
  });
});
