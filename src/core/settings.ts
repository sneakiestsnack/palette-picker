// Persisted preferences (A26). Never images or palettes.
import { parseHex } from './color';
import {
  HUE_WEIGHT_DEFAULT, NOTAN_BANDS_DEFAULT, NOTAN_BANDS_MAX, NOTAN_BANDS_MIN, OVERLAY_DEFAULT,
  PALETTE_SIZE_DEFAULT, PALETTE_SIZE_MAX, PALETTE_SIZE_MIN, VALUE_RANGE_DEFAULT, VARIETY_DEFAULT,
} from './tuning';
import type { Controls, OverlaySettings, SortMode, ValueRange, ViewMode } from './types';

export interface Settings {
  readonly controls: Controls;
  readonly overlay: OverlaySettings;
  readonly sortMode: SortMode;
  readonly view: ViewMode;
  readonly notanBands: number;
  readonly phoneControlsOpen: boolean;
}

export const DEFAULT_CONTROLS: Controls = {
  size: PALETTE_SIZE_DEFAULT,
  variety: VARIETY_DEFAULT,
  hueWeight: HUE_WEIGHT_DEFAULT,
  valueRange: VALUE_RANGE_DEFAULT,
};

export const DEFAULT_SETTINGS: Settings = {
  controls: DEFAULT_CONTROLS,
  overlay: OVERLAY_DEFAULT,
  sortMode: 'value',
  view: 'color',
  notanBands: NOTAN_BANDS_DEFAULT,
  phoneControlsOpen: true,
};

const SORT_MODES: readonly SortMode[] = ['value', 'hue', 'saturation', 'frequency'];
const VIEW_MODES: readonly ViewMode[] = ['color', 'gray', 'notan'];
const OVERLAY_MODES: readonly OverlaySettings['mode'][] = ['tint', 'dim'];

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

function num(x: unknown, lo: number, hi: number, fallback: number): number {
  if (typeof x !== 'number' || !Number.isFinite(x)) return fallback;
  const r = Math.round(x);
  return r < lo ? lo : r > hi ? hi : r;
}

function oneOf<T extends string>(x: unknown, options: readonly T[], fallback: T): T {
  return typeof x === 'string' && (options as readonly string[]).includes(x) ? (x as T) : fallback;
}

const bool = (x: unknown, fallback: boolean) => (typeof x === 'boolean' ? x : fallback);
const hex = (x: unknown, fallback: string) => (typeof x === 'string' ? parseHex(x) ?? fallback : fallback);

function parseRange(x: unknown): ValueRange {
  const d = VALUE_RANGE_DEFAULT;
  if (!isObj(x)) return d;
  const a = num(x.min, 0, 100, d.min);
  const b = num(x.max, 0, 100, d.max);
  return a <= b ? { min: a, max: b } : { min: b, max: a };
}

function parseControls(x: unknown): Controls {
  const d = DEFAULT_CONTROLS;
  if (!isObj(x)) return d;
  return {
    size: num(x.size, PALETTE_SIZE_MIN, PALETTE_SIZE_MAX, d.size),
    variety: num(x.variety, 0, 100, d.variety),
    hueWeight: num(x.hueWeight, 0, 100, d.hueWeight),
    valueRange: parseRange(x.valueRange),
  };
}

function parseOverlay(x: unknown): OverlaySettings {
  const d = OVERLAY_DEFAULT;
  if (!isObj(x)) return d;
  return {
    enabled: bool(x.enabled, d.enabled),
    mode: oneOf(x.mode, OVERLAY_MODES, d.mode),
    darkTint: hex(x.darkTint, d.darkTint),
    lightTint: hex(x.lightTint, d.lightTint),
    opacity: num(x.opacity, 10, 100, d.opacity),
  };
}

// Never throws.
export function parseSettings(raw: string | null): Settings {
  if (raw === null) return DEFAULT_SETTINGS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (!isObj(data) || data.v !== 1) return DEFAULT_SETTINGS;
  const d = DEFAULT_SETTINGS;
  return {
    controls: parseControls(data.controls),
    overlay: parseOverlay(data.overlay),
    sortMode: oneOf(data.sortMode, SORT_MODES, d.sortMode),
    view: oneOf(data.view, VIEW_MODES, d.view),
    notanBands: num(data.notanBands, NOTAN_BANDS_MIN, NOTAN_BANDS_MAX, d.notanBands),
    phoneControlsOpen: bool(data.phoneControlsOpen, d.phoneControlsOpen),
  };
}

export function serializeSettings(s: Settings): string {
  return JSON.stringify({ v: 1, ...s });
}
