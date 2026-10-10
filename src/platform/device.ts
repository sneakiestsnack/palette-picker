// Device detection for the share/download choice (Appendix D §D6).

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isTouchDevice(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

// LUT rendering writes Uint32 pixels and assumes little-endian byte order (Appendix G #19).
export function checkLittleEndian(): void {
  if (new Uint8Array(new Uint32Array([1]).buffer)[0] !== 1) {
    console.error('Palette Picker: big-endian platform; overlay colors will be wrong.');
  }
}
