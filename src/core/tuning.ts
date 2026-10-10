// The one tuning file (blueprint §5.3). Every tunable number and default lives here only.
import type { Hex, OverlaySettings, ValueRange } from './types';

// Palette size
export const PALETTE_SIZE_MIN = 2;
export const PALETTE_SIZE_MAX = 16;
export const PALETTE_SIZE_DEFAULT = 6;

// Sliders (slider units 0..100)
export const VARIETY_DEFAULT = 50;
export const HUE_WEIGHT_DEFAULT = 35;
export const HUE_WEIGHT_MIN_FACTOR = 0.1;
export const VALUE_RANGE_DEFAULT: ValueRange = { min: 0, max: 100 };

// Extraction
export const MIN_DISTINCT_DE = 0.04;
export const CANDIDATE_COUNT = 48;
export const KMEANS_ITERATIONS = 4;
export const MIN_CANDIDATE_SHARE = 0.002;
export const ALPHA_OPAQUE_MIN = 128;

// Image tiers (px, longest edge) and input limits
export const PROCESS_MAX_EDGE = 300;
export const MASK_MAX_EDGE = 800;
export const DISPLAY_MAX_EDGE = 2048;
export const MAX_INPUT_PIXELS = 80_000_000;
export const MAX_INPUT_BYTES = 104_857_600;

// Color
export const ACHROMATIC_C = 0.02;
export const HISTOGRAM_BINS = 101;

// Overlay and show-where
export const OVERLAY_DEFAULT: OverlaySettings = {
  enabled: false,
  mode: 'tint',
  darkTint: '#1E5BFF',
  lightTint: '#FF1EC8',
  opacity: 60,
};
export const OVERLAY_DIM_FACTOR = 0.5;
export const SHOW_WHERE_DIM_ALPHA = 191;

// Copy. COPY_PREFIX flips to '' if CSP rejects '#' (Phase 8 human check).
export const COPY_PREFIX: string = '#';
export const COPY_ALL_SEPARATOR = '\n';

// Timing (ms)
export const TOAST_MS = 1200;
export const UNDO_TOAST_MS = 8000;
export const PENDING_INDICATOR_DELAY_MS = 150;
export const SETTINGS_SAVE_DEBOUNCE_MS = 300;

// PNG card (A22)
export const CARD_SWATCH = 160;
export const CARD_LABEL_H = 44;
export const CARD_GAP = 16;
export const CARD_PAD = 32;
export const CARD_COLS_MAX = 8;
export const CARD_SCALE = 2;
export const CARD_BG: Hex = '#FFFFFF';
export const CARD_TEXT: Hex = '#1A1A1A';
export const CARD_SWATCH_STROKE = 'rgba(0,0,0,0.12)';
export const CARD_FONT = '600 22px ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace';

// Value slider track
export const GRADIENT_STOPS = 11;

// Touch eyedropper loupe
export const LOUPE_SIZE_PX = 120;
export const LOUPE_ZOOM = 8;
export const LOUPE_OFFSET_Y_PX = 90;

// Notan
export const NOTAN_BANDS_MIN = 2;
export const NOTAN_BANDS_MAX = 5;
export const NOTAN_BANDS_DEFAULT = 3;
export const NOTAN_PERCENTILE_LOW = 2;
export const NOTAN_PERCENTILE_HIGH = 98;

// Harmony and gamut
export const HARMONY_WARM_HUE = 60;
export const HARMONY_COOL_HUE = 250;
export const HARMONY_TEMP_SHIFT_DEG = 12;
export const HARMONY_NEUTRAL_TINT_C = 0.02;
export const GAMUT_BISECT_STEPS = 24;

// Library storage
export const THUMBNAIL_EDGE = 160;
export const THUMBNAIL_JPEG_Q = 0.8;
export const STORED_DISPLAY_EDGE = 1280;
export const STORED_DISPLAY_JPEG_Q = 0.85;
export const TAGS_MAX = 20;
export const TAG_MAX_LEN = 30;
export const NAME_MAX_LEN = 100;

// Persistence keys and file format
export const SETTINGS_KEY = 'palette-picker:settings:v1';
export const DB_NAME = 'palette-picker';
export const DB_VERSION = 1;
export const PALETTE_FILE_FORMAT = 'palette-picker';
export const PALETTE_FILE_VERSION = 1;
export const PALETTE_FILE_EXT = '.palette.json';

// Layout. Keep in sync with the CSS literal `@media (max-width: 899.98px)`.
export const PHONE_BREAKPOINT_PX = 900;
