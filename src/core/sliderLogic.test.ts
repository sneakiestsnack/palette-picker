import { describe, expect, it } from 'vitest';
import { keyTarget, moveHandle, pickHandle, pickStackedByDirection, posToValue } from './sliderLogic';

describe('A21 slider logic', () => {
  it('posToValue', () => {
    expect(posToValue(150, 100, 200, 0, 100)).toBe(25);
    expect(posToValue(50, 100, 200, 0, 100)).toBe(0);
    expect(posToValue(310, 100, 200, 0, 100)).toBe(100);
  });

  it('moveHandle never crosses or pushes', () => {
    expect(moveHandle([20, 60], 0, 70, 0, 0, 100)).toEqual([60, 60]);
    expect(moveHandle([20, 60], 1, 10, 0, 0, 100)).toEqual([20, 20]);
    expect(moveHandle([20, 40, 60], 1, 60, 1, 0, 100)).toEqual([20, 59, 60]);
  });

  it('moveHandle returns a copy', () => {
    const v = [20, 60];
    moveHandle(v, 0, 30, 0, 0, 100);
    expect(v).toEqual([20, 60]);
  });

  it('pickHandle', () => {
    expect(pickHandle([20, 60], 30)).toBe(0);
    expect(pickHandle([20, 60], 40)).toBe(0);
    expect(pickHandle([50, 50], 30)).toBe(0);
    expect(pickHandle([50, 50], 70)).toBe(1);
    expect(pickHandle([50, 50], 50)).toBeNull();
    expect(pickHandle([7], 90)).toBe(0);
  });

  it('stacked handles resolve by direction', () => {
    expect(pickStackedByDirection([50, 50], 50, false)).toBe(0);
    expect(pickStackedByDirection([50, 50], 50, true)).toBe(1);
  });

  it('keyboard targets', () => {
    expect(keyTarget('ArrowLeft', false, 50, 0, 100)).toBe(49);
    expect(keyTarget('ArrowUp', false, 50, 0, 100)).toBe(51);
    expect(keyTarget('ArrowRight', true, 95, 0, 100)).toBe(100);
    expect(keyTarget('PageDown', false, 5, 0, 100)).toBe(0);
    expect(keyTarget('PageUp', false, 50, 0, 100)).toBe(60);
    expect(keyTarget('Home', false, 50, 2, 16)).toBe(2);
    expect(keyTarget('End', false, 50, 2, 16)).toBe(16);
    expect(keyTarget('a', false, 50, 0, 100)).toBeNull();
  });
});
