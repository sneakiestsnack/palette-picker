import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings, serializeSettings } from './settings';

describe('A26 settings', () => {
  it('null, garbage and wrong version → defaults', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('garbage')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"v":2}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('[1]')).toEqual(DEFAULT_SETTINGS);
  });

  it('size is clamped, everything else default', () => {
    const s = parseSettings('{"v":1,"controls":{"size":40}}');
    expect(s).toEqual({ ...DEFAULT_SETTINGS, controls: { ...DEFAULT_SETTINGS.controls, size: 16 } });
  });

  it('reversed value range is swapped', () => {
    expect(parseSettings('{"v":1,"controls":{"valueRange":{"min":70,"max":20}}}').controls.valueRange).toEqual({ min: 20, max: 70 });
  });

  it('tint colors are normalized', () => {
    expect(parseSettings('{"v":1,"overlay":{"darkTint":"#abc123"}}').overlay.darkTint).toBe('#ABC123');
  });

  it('invalid field → that field default', () => {
    expect(parseSettings('{"v":1,"controls":{"variety":"high"}}').controls.variety).toBe(50);
  });

  it('round-trips', () => {
    const s = { ...DEFAULT_SETTINGS, controls: { size: 3, variety: 0, hueWeight: 77, valueRange: { min: 40, max: 90 } } };
    const json = JSON.parse(serializeSettings(s));
    expect(json.v).toBe(1);
    expect(parseSettings(serializeSettings(s))).toEqual(s);
  });
});
