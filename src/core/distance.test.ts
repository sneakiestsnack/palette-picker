import { describe, expect, it } from 'vitest';
import { deltaE, hueFactor, varietyFactor, weightedDistance } from './distance';
import type { Lab } from './types';

const polar = (L: number, C: number, deg: number): Lab => {
  const r = (deg * Math.PI) / 180;
  return [L, C * Math.cos(r), C * Math.sin(r)];
};

describe('A4 weightedDistance', () => {
  it('opposite hues scale with h', () => {
    const p: Lab = [0.7, 0.1, 0];
    const q: Lab = [0.7, -0.1, 0];
    expect(weightedDistance(p, q, 1)).toBeCloseTo(0.2, 6);
    expect(weightedDistance(p, q, 0.25)).toBeCloseTo(0.05, 6);
    expect(weightedDistance(p, q, 0.1)).toBeCloseTo(0.02, 6);
  });

  it('has no 0°/360° wraparound', () => {
    expect(weightedDistance(polar(0.7, 0.1, 350), polar(0.7, 0.1, 10), 1)).toBeCloseTo(0.03473, 5);
    expect(weightedDistance(polar(0.7, 0.1, 170), polar(0.7, 0.1, 190), 1)).toBeCloseTo(0.03473, 5);
  });

  it('near-grays get tiny hue differences', () => {
    const p: Lab = [0.6, 0.001, 0];
    const q: Lab = [0.6, -0.001, 0];
    expect(weightedDistance(p, q, 1)).toBeCloseTo(0.002, 6);
    expect(weightedDistance(p, q, 0.1)).toBeCloseTo(0.0002, 6);
  });

  it('mixed difference, and equals deltaE at h = 1', () => {
    const p = polar(0.5, 0.1, 30);
    const q = polar(0.6, 0.15, 120);
    expect(weightedDistance(p, q, 0.415)).toBeCloseTo(0.132916, 5);
    expect(weightedDistance(p, q, 1)).toBeCloseTo(0.206155, 5);
    expect(deltaE(p, q)).toBeCloseTo(0.206155, 5);
  });
});

describe('A4 factors', () => {
  it('hueFactor and varietyFactor', () => {
    expect(hueFactor(0)).toBeCloseTo(0.1, 10);
    expect(hueFactor(35)).toBeCloseTo(0.415, 10);
    expect(hueFactor(100)).toBeCloseTo(1, 10);
    expect(varietyFactor(50)).toBe(0.5);
  });
});
