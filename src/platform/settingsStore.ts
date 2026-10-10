// localStorage adapter for settings. Storage can be unavailable (private mode, blocked): never throw.
import { parseSettings, serializeSettings, type Settings } from '../core/settings';
import { SETTINGS_KEY, SETTINGS_SAVE_DEBOUNCE_MS } from '../core/tuning';

export function loadSettings(): Settings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return parseSettings(null);
  }
}

function write(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, serializeSettings(s));
  } catch {
    // ignore: preferences are a convenience
  }
}

let pending: Settings | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  if (pending) write(pending);
  pending = null;
}

// Debounced; flushed when the page is hidden so a quick reload keeps the latest values.
export function saveSettings(s: Settings): void {
  pending = s;
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(flush, SETTINGS_SAVE_DEBOUNCE_MS);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
