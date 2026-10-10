import { STRINGS } from '../strings';
import styles from './Panel.module.css';

// Right-hand panel (Appendix D §D1). Sections fill in from Phase 6 on.
export function Panel() {
  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.heading}>{STRINGS.CONTROLS}</h2>
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading}>{STRINGS.PALETTE}</h2>
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading}>{STRINGS.EXPORT}</h2>
      </section>
    </aside>
  );
}
