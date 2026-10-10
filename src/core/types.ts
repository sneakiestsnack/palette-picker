export type Hex = string;                                  // /^#[0-9A-F]{6}$/
export type Rgb8 = readonly [r: number, g: number, b: number];
export type Lab = readonly [L: number, a: number, b: number];
export type Lch = readonly [L: number, C: number, h: number];

export interface RgbaImage {                               // replaces DOM ImageData inside core
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;                        // RGBA, row-major, length = width*height*4
}

export interface ValueRange { readonly min: number; readonly max: number }   // ints 0..100, min <= max

export interface Controls {
  readonly size: number;        // 2..16
  readonly variety: number;     // 0..100
  readonly hueWeight: number;   // 0..100
  readonly valueRange: ValueRange;
}

export interface LabPixels {                               // opaque processing pixels only
  readonly count: number;
  readonly lab: Float64Array;                              // 3*count, interleaved L,a,b
  readonly value: Uint8Array;                              // count, 0..100
}

export interface Candidate {
  readonly index: number;                                  // position after the A9 sort
  readonly hex: Hex;
  readonly lab: Lab;                                       // = hexToLab(hex)
  readonly value: number;
  readonly count: number;
  readonly share: number;                                  // count / inRangePixelCount
}

export interface ExtractParams {
  readonly controls: Controls;
  readonly locked: readonly Hex[];                         // [] until M3
  readonly excluded: readonly number[];                    // candidate indexes; [] until M3
}

export interface Pick { readonly hex: Hex; readonly candidateIndex: number }

export interface ExtractResult {
  readonly picks: readonly Pick[];                         // selection order, excludes locked
  readonly shortfall: boolean;                             // picks.length < size - locked.length
  readonly inRangePixelCount: number;
  readonly candidateCount: number;
}

export type EntryOrigin = 'extracted' | 'eyedropper' | 'harmony';
export interface PaletteEntry {
  readonly hex: Hex;
  readonly locked: boolean;
  readonly origin: EntryOrigin;
  readonly candidateIndex: number | null;                  // null unless origin 'extracted' and fresh
}

export type SortMode = 'value' | 'hue' | 'saturation' | 'frequency';
export type ViewMode = 'color' | 'gray' | 'notan';
export interface OverlaySettings {
  readonly enabled: boolean;
  readonly mode: 'tint' | 'dim';
  readonly darkTint: Hex;
  readonly lightTint: Hex;
  readonly opacity: number;                                // 10..100 (percent)
}
