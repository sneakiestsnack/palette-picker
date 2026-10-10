import { STRINGS } from '../strings';
import { Controls } from './Controls';
import { ExportSection } from './ExportSection';
import styles from './Panel.module.css';
import { PaletteSection } from './PaletteSection';

// Right-hand panel (Appendix D §D1).
export function Panel() {
  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.heading}>{STRINGS.CONTROLS}</h2>
        <Controls />
      </section>
      <section className={styles.section}>
        <PaletteSection />
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading}>{STRINGS.EXPORT}</h2>
        <ExportSection />
      </section>
    </aside>
  );
}
