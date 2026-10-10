// File names (A28). The platform reads the local clock and passes the parts in (core never reads time).

export interface DateParts { readonly y: number; readonly mo: number; readonly d: number; readonly h: number; readonly mi: number }

const pad2 = (n: number) => String(n).padStart(2, '0');

export function datePart(p: DateParts): string {
  return `${p.y}${pad2(p.mo)}${pad2(p.d)}`;
}

export function timestampPart(p: DateParts): string {
  return `${datePart(p)}-${pad2(p.h)}${pad2(p.mi)}`;
}

export function sanitizeFileBase(name: string): string {
  const base = name.replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  return base === '' ? 'palette' : base;
}

// Unsaved → palette-<timestamp>.<ext>; saved (M4) → <sanitized name>.<ext>.
export function exportFileName(savedName: string | null, parts: DateParts, ext: 'aco' | 'png' | 'cls'): string {
  return savedName === null ? `palette-${timestampPart(parts)}.${ext}` : `${sanitizeFileBase(savedName)}.${ext}`;
}
