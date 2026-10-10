// Slider logic for N handles with a minimum gap (A21). Shared by the value range (N=2, gap 0),
// the single sliders (N=1) and the notan thresholds (Phase 18, gap 1).

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function posToValue(x: number, left: number, width: number, lo: number, hi: number): number {
  if (!(width > 0)) return lo;
  return clamp(Math.round(((x - left) / width) * (hi - lo)) + lo, lo, hi);
}

// Never crosses or pushes a neighbour.
export function moveHandle(values: readonly number[], i: number, target: number, minGap: number, lo: number, hi: number): number[] {
  const out = values.slice();
  const n = out.length;
  const min = i > 0 ? out[i - 1]! + minGap : lo;
  const max = i < n - 1 ? out[i + 1]! - minGap : hi;
  out[i] = clamp(target, min, max);
  return out;
}

// Nearest handle; equidistant groups → the lower one. Stacked handles (equal values): v below → lowest index,
// above → highest index, equal → null (the caller decides on the first pointer move).
export function pickHandle(values: readonly number[], v: number): number | null {
  if (values.length === 0) return null;
  let bestValue = values[0]!;
  let bestDist = Math.abs(bestValue - v);
  for (const x of values) {
    const d = Math.abs(x - v);
    if (d < bestDist || (d === bestDist && x < bestValue)) {
      bestDist = d;
      bestValue = x;
    }
  }
  const first = values.indexOf(bestValue);
  const last = values.lastIndexOf(bestValue);
  if (first === last) return first;
  if (v < bestValue) return first;
  if (v > bestValue) return last;
  return null;
}

// Resolves a stacked pick (pickHandle → null) from the first movement direction.
export function pickStackedByDirection(values: readonly number[], stackedValue: number, movingUp: boolean): number {
  return movingUp ? values.lastIndexOf(stackedValue) : values.indexOf(stackedValue);
}

// Keyboard: arrows ±1, Shift+arrow / PageUp / PageDown ±10, Home / End → bounds. null = key not handled.
export function keyTarget(key: string, shift: boolean, value: number, lo: number, hi: number): number | null {
  const step = shift ? 10 : 1;
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return clamp(value - step, lo, hi);
    case 'ArrowRight':
    case 'ArrowUp':
      return clamp(value + step, lo, hi);
    case 'PageDown':
      return clamp(value - 10, lo, hi);
    case 'PageUp':
      return clamp(value + 10, lo, hi);
    case 'Home':
      return lo;
    case 'End':
      return hi;
    default:
      return null;
  }
}
