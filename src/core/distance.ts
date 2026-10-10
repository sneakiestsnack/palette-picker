// Color distances and slider factors (A4).
import { HUE_WEIGHT_MIN_FACTOR } from './tuning';
import type { Lab } from './types';

export function deltaE(p: Lab, q: Lab): number {
  const dL = p[0] - q[0];
  const da = p[1] - q[1];
  const db = p[2] - q[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

// Hue difference comes from a/b (no angles): no 0°/360° wraparound, and near-grays get tiny hue differences.
export function weightedDistance(p: Lab, q: Lab, h: number): number {
  const dL = p[0] - q[0];
  const da = p[1] - q[1];
  const db = p[2] - q[2];
  const dC = Math.hypot(p[1], p[2]) - Math.hypot(q[1], q[2]);
  const dH2 = Math.max(0, da * da + db * db - dC * dC);
  return Math.sqrt(dL * dL + dC * dC + h * h * dH2);
}

export function varietyFactor(s: number): number {
  return s / 100;
}

export function hueFactor(s: number): number {
  return HUE_WEIGHT_MIN_FACTOR + ((1 - HUE_WEIGHT_MIN_FACTOR) * s) / 100;
}
