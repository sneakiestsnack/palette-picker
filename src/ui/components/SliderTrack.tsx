// N-handle slider built from divs with pointer events (Appendix D §D3). Slider and RangeSlider wrap it.
import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { keyTarget, moveHandle, pickHandle, pickStackedByDirection, posToValue } from '../../core';
import styles from './Slider.module.css';

export interface SliderTrackProps {
  values: readonly number[];
  lo: number;
  hi: number;
  minGap?: number;
  thumbLabels: readonly string[];
  thumbTestIds?: readonly string[];
  trackStyle?: CSSProperties;
  trackTestId?: string;
  onChange(values: number[]): void;
}

export function SliderTrack({ values, lo, hi, minGap = 0, thumbLabels, thumbTestIds, trackStyle, trackTestId, onChange }: SliderTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const drag = useRef<{ index: number | null; stackedValue: number; values: number[] } | null>(null);

  const valueAt = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    return posToValue(clientX, r.left, r.width, lo, hi);
  };

  const apply = (current: number[], index: number, target: number) => {
    const next = moveHandle(current, index, target, minGap, lo, hi);
    if (next[index] !== current[index]) onChange(next);
    return next;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = valueAt(e.clientX);
    const index = pickHandle(values, v);
    const current = values.slice();
    if (index === null) {
      drag.current = { index: null, stackedValue: v, values: current };
      thumbRefs.current[values.indexOf(v)]?.focus();
      return;
    }
    thumbRefs.current[index]?.focus();
    drag.current = { index, stackedValue: v, values: apply(current, index, v) };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const v = valueAt(e.clientX);
    if (d.index === null) {
      if (v === d.stackedValue) return;
      d.index = pickStackedByDirection(d.values, d.stackedValue, v > d.stackedValue);
      thumbRefs.current[d.index]?.focus();
    }
    d.values = apply(d.values, d.index, v);
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLDivElement>) => {
    const target = keyTarget(e.key, e.shiftKey, values[i]!, lo, hi);
    if (target === null) return;
    e.preventDefault();
    apply(values.slice(), i, target);
  };

  const pct = (v: number) => (hi === lo ? 0 : ((v - lo) / (hi - lo)) * 100);
  const fill = values.length === 1
    ? { left: '0%', width: `${pct(values[0]!)}%` }
    : { left: `${pct(values[0]!)}%`, width: `${pct(values.at(-1)!) - pct(values[0]!)}%` };

  return (
    <div
      ref={trackRef}
      className={styles.track}
      style={trackStyle}
      data-testid={trackTestId}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {!trackStyle && <div className={styles.fill} style={fill} />}
      {values.map((v, i) => (
        <div
          key={i}
          ref={(el) => { thumbRefs.current[i] = el; }}
          className={styles.thumb}
          style={{ left: `${pct(v)}%` }}
          role="slider"
          tabIndex={0}
          aria-label={thumbLabels[i]}
          aria-valuemin={lo}
          aria-valuemax={hi}
          aria-valuenow={v}
          data-testid={thumbTestIds?.[i]}
          onKeyDown={onKeyDown(i)}
        />
      ))}
    </div>
  );
}
