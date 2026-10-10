import { useMemo } from 'react';
import { GRADIENT_STOPS, grayHexForValue } from '../../core';
import { Histogram } from './Histogram';
import styles from './Slider.module.css';
import { SliderTrack } from './SliderTrack';

interface SliderProps {
  label: string;
  value: number;
  lo: number;
  hi: number;
  testId: string;
  captions?: readonly [string, string];
  onChange(value: number): void;
}

// Single-value slider; the thumb carries the test id.
export function Slider({ label, value, lo, hi, testId, captions, onChange }: SliderProps) {
  return (
    <div className={styles.control}>
      <div className={styles.labelRow}>
        <span>{label}</span>
        <span className={styles.number}>{value}</span>
      </div>
      <SliderTrack values={[value]} lo={lo} hi={hi} thumbLabels={[label]} thumbTestIds={[testId]} onChange={(v) => onChange(v[0]!)} />
      {captions && (
        <div className={styles.captions}>
          <span>{captions[0]}</span>
          <span>{captions[1]}</span>
        </div>
      )}
    </div>
  );
}

interface RangeSliderProps {
  label: string;
  values: readonly number[];
  minGap?: number;
  thumbLabels: readonly string[];
  testId: string;
  valueText: string;
  histogram?: readonly number[];
  onChange(values: number[]): void;
}

// N-handle value slider on a dark-to-light gray track (GRADIENT_STOPS perceptual grays).
export function RangeSlider({ label, values, minGap = 0, thumbLabels, testId, valueText, histogram, onChange }: RangeSliderProps) {
  const trackStyle = useMemo(() => {
    const stops = Array.from({ length: GRADIENT_STOPS }, (_, i) => {
      const v = (i * 100) / (GRADIENT_STOPS - 1);
      return `${grayHexForValue(v)} ${v}%`;
    });
    return { background: `linear-gradient(to right, ${stops.join(', ')})` };
  }, []);
  return (
    <div className={styles.control}>
      <div className={styles.labelRow}>
        <span>{label}</span>
        <span className={styles.number}>{valueText}</span>
      </div>
      <SliderTrack
        values={values}
        lo={0}
        hi={100}
        minGap={minGap}
        thumbLabels={thumbLabels}
        thumbTestIds={values.map((_, i) => `${testId}-thumb-${i}`)}
        trackTestId={testId}
        trackStyle={trackStyle}
        trackClassName={histogram ? styles.withHistogram : undefined}
        behind={histogram && <Histogram bins={histogram} />}
        onChange={onChange}
      />
    </div>
  );
}
