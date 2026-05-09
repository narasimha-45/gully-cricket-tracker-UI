
import styles from "./AppShell.module.css";

export default function AppShell({ title, children, bottomAction }) {
  return (
    <div className={styles.page}>
      <div className={styles.app}>
        <header className={styles.header}>{title}</header>

        <main className={styles.content}>
          {children}
        </main>

        {bottomAction && (
          <footer className={styles.footer}>
            {bottomAction}
          </footer>
        )}
      </div>
    </div>
  );
}
