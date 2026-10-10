// PaletteEngine (A13): holds the current image and a candidates cache keyed by value range.
// Phase 13: coverage + label map. getProcessing arrives with the library (Phase 16).
import { buildCandidates } from './cluster';
import { coverageShares, labelMap } from './coverage';
import { downsampleBox, toLabPixels, valueHistogram, valueMap } from './image';
import { reroll } from './reroll';
import { selectPalette } from './select';
import { MASK_MAX_EDGE, PROCESS_MAX_EDGE } from './tuning';
import type { Candidate, ExtractParams, ExtractResult, Hex, LabPixels, RgbaImage, ValueRange } from './types';

export interface LoadedInfo {
  readonly imageId: number;
  readonly width: number;                                  // display size
  readonly height: number;
  readonly valueMap: Uint8Array;                           // display resolution, 255 = transparent
  readonly histogram: number[];                            // HISTOGRAM_BINS, opaque processing pixels
  readonly processingWidth: number;
  readonly processingHeight: number;
}

interface CandidateSet { readonly candidates: Candidate[]; readonly inRangePixelCount: number }

const CACHE_LIMIT = 8;

export class PaletteEngine {
  private imageId: number | null = null;
  private display: RgbaImage | null = null;
  private processing: RgbaImage | null = null;
  private pixels: LabPixels | null = null;
  private mask: RgbaImage | null = null;                    // show-where resolution, built once lazily
  private readonly cache = new Map<string, CandidateSet>();   // insertion order = recency (LRU)

  get currentImageId(): number | null {
    return this.imageId;
  }

  load(imageId: number, display: RgbaImage, processing?: RgbaImage): LoadedInfo {
    const proc = processing ?? downsampleBox(display, PROCESS_MAX_EDGE);
    const pixels = toLabPixels(proc);
    const info: LoadedInfo = {
      imageId,
      width: display.width,
      height: display.height,
      valueMap: valueMap(display),
      histogram: valueHistogram(pixels),
      processingWidth: proc.width,
      processingHeight: proc.height,
    };
    this.imageId = imageId;
    this.display = display;                                 // kept for the lazy mask image (Phase 13)
    this.processing = proc;
    this.pixels = pixels;
    this.mask = null;
    this.cache.clear();
    return info;
  }

  extract(params: ExtractParams): ExtractResult {
    const set = this.candidatesFor(params.controls.valueRange);
    const { picks, shortfall } = selectPalette(set.candidates, params.controls, params.locked, params.excluded);
    return { picks, shortfall, inRangePixelCount: set.inRangePixelCount, candidateCount: set.candidates.length };
  }

  reroll(params: ExtractParams, currentPicks: readonly number[]): { result: ExtractResult; excluded: number[] } {
    const set = this.candidatesFor(params.controls.valueRange);
    const { result, excluded } = reroll(set.candidates, params, currentPicks);
    return {
      result: { ...result, inRangePixelCount: set.inRangePixelCount, candidateCount: set.candidates.length },
      excluded,
    };
  }

  coverage(palette: readonly Hex[], range: ValueRange): { shares: number[]; inRangePixelCount: number } {
    if (!this.pixels) throw new Error('no-image');
    return coverageShares(this.pixels, range, palette);
  }

  labelMap(palette: readonly Hex[], range: ValueRange): { width: number; height: number; labels: Uint8Array } {
    if (!this.display) throw new Error('no-image');
    this.mask ??= downsampleBox(this.display, MASK_MAX_EDGE);
    return { width: this.mask.width, height: this.mask.height, labels: labelMap(this.mask, range, palette) };
  }

  private candidatesFor(range: ValueRange): CandidateSet {
    if (!this.pixels) throw new Error('no-image');
    const key = `${range.min}-${range.max}`;
    let set = this.cache.get(key);
    if (set) {
      this.cache.delete(key);
    } else {
      set = buildCandidates(this.pixels, range);
      if (this.cache.size >= CACHE_LIMIT) this.cache.delete(this.cache.keys().next().value!);
    }
    this.cache.set(key, set);
    return set;
  }
}
