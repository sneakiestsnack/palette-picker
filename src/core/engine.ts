// PaletteEngine (A13): holds the current image and a candidates cache keyed by value range.
// Phase 3: load + extract. Re-roll, coverage, label map and getProcessing arrive in later phases.
import { buildCandidates } from './cluster';
import { downsampleBox, toLabPixels, valueHistogram, valueMap } from './image';
import { selectPalette } from './select';
import { PROCESS_MAX_EDGE } from './tuning';
import type { Candidate, ExtractParams, ExtractResult, LabPixels, RgbaImage, ValueRange } from './types';

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
    this.cache.clear();
    return info;
  }

  extract(params: ExtractParams): ExtractResult {
    const set = this.candidatesFor(params.controls.valueRange);
    const { picks, shortfall } = selectPalette(set.candidates, params.controls, params.locked, params.excluded);
    return { picks, shortfall, inRangePixelCount: set.inRangePixelCount, candidateCount: set.candidates.length };
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
