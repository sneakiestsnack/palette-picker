import { useMemo } from 'react';
import styles from './Slider.module.css';

// Value histogram behind the value-range track: one bar per value, height ∝ sqrt(count / max).
export function Histogram({ bins }: { bins: readonly number[] }) {
  const path = useMemo(() => {
    const max = Math.max(0, ...bins);
    if (max === 0) return '';
    const n = bins.length;
    let d = '';
    bins.forEach((c, i) => {
      const h = Math.sqrt(c / max);
      if (h > 0) d += `M${i / n} 1V${1 - h}h${1 / n}V1z`;
    });
    return d;
  }, [bins]);
  return (
    <svg className={styles.histogram} viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}
