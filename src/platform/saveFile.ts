// Saving files (Appendix D §D6). Phase 8: anchor download; Phase 9 adds the share-sheet path.
import type { DateParts } from '../core/fileNames';

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

export function saveFile(bytes: Uint8Array | Blob, name: string, mime: string): void {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime });
  downloadBlob(blob, name);
}

// The local clock, as parts for core's file-name helpers.
export function nowParts(): DateParts {
  const t = new Date();
  return { y: t.getFullYear(), mo: t.getMonth() + 1, d: t.getDate(), h: t.getHours(), mi: t.getMinutes() };
}
