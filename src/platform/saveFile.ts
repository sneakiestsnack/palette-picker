// Saving files (Appendix D §D6): share sheet on iOS (any file) and for images on touch devices,
// otherwise an anchor download. Call synchronously from the click handler with the bytes ready (Appendix G #11).
import type { DateParts } from '../core/fileNames';
import { isIOS, isTouchDevice } from './device';

const REVOKE_DELAY_MS = 10_000;                              // revoking at once can cancel the download

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

function canShareFile(file: File): boolean {
  try {
    return typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) === true;
  } catch {
    return false;
  }
}

export function saveFile(bytes: Uint8Array | Blob, name: string, mime: string): void {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime });
  const isImage = mime.startsWith('image/');
  if (isIOS() || (isImage && isTouchDevice())) {
    const file = new File([blob], name, { type: mime });
    if (canShareFile(file)) {
      navigator.share({ files: [file] }).catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;   // the user cancelled
        downloadBlob(blob, name);
      });
      return;
    }
  }
  downloadBlob(blob, name);
}

// The local clock, as parts for core's file-name helpers.
export function nowParts(): DateParts {
  const t = new Date();
  return { y: t.getFullYear(), mo: t.getMonth() + 1, d: t.getDate(), h: t.getHours(), mi: t.getMinutes() };
}
