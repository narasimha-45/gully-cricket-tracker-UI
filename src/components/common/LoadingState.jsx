import styles from "./StateView.module.css";

/**
 * Blocking/page-level loader. Deliberately small and cricket-specific.
 * Data-heavy views use skeleton rows instead so content does not jump.
 */
export default function LoadingState({ label = "Loading…", compact = false }) {
  return (
    <div
      className={`${styles.wrap} ${compact ? styles.compact : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.ball} aria-hidden="true">
        <span className={styles.seam} />
      </span>
      <p className={styles.subtitle}>{label}</p>
    </div>
  );
}
