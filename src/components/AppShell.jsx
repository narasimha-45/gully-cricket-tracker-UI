import styles from "./AppShell.module.css";

export default function AppShell({
  title,
  children,
  bottomAction,
}) {
  return (
    <div className={styles.page}>
      <div className={styles.app}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <img
              src="/gull-cricket-logo/favicon.svg"
              alt="Gully Cricket"
              className={styles.logo}
            />

            <span className={styles.title}>
              Gully Cricket
            </span>
          </div>
        </header>

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