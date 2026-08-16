import styles from "./StateView.module.css";

export default function EmptyState({ title = "No data", subtitle }) {
  return (
    <div className={styles.wrap}>
      <p className={styles.title}>{title}</p>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
