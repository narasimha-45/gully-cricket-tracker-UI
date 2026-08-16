import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useSyncPendingMatches } from "../hooks/useSyncPendingMatches";
import ErrorBoundary from "./common/ErrorBoundary";
import styles from "./AppShell.module.css";

export default function AppShell({ title = "Gully Cricket", children, bottomAction }) {
  const { pendingCount, syncing, retryNow } = useSyncPendingMatches();
  const location = useLocation();
  const online = useNetworkStatus();
  const [localSaveError, setLocalSaveError] = useState("");

  useEffect(() => {
    const handleLocalSaveError = (event) =>
      setLocalSaveError(event.detail?.message || "Unable to save this match on this device.");
    window.addEventListener("gully:local-save-error", handleLocalSaveError);
    return () => window.removeEventListener("gully:local-save-error", handleLocalSaveError);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.app}>
        <header className={styles.header}>
          <div className={styles.brand} aria-label={title}>
            <span className={styles.logoMark} aria-hidden="true">🏏</span>
            <span className={styles.title}>{title}</span>
          </div>

          {pendingCount > 0 && (
            <button
              type="button"
              className={styles.syncBadge}
              onClick={retryNow}
              disabled={syncing || !online}
              aria-live="polite"
              title={online ? "Retry pending match sync" : "Sync will resume when online"}
            >
              <span className={`${styles.syncDot} ${syncing ? styles.syncing : ""}`} />
              <span>{syncing ? "Syncing" : pendingCount}</span>
            </button>
          )}
        </header>

        {!online && (
          <div className={styles.offlineBanner} role="status">
            Offline · scoring stays safely on this device
          </div>
        )}

        {localSaveError && (
          <button
            type="button"
            className={styles.saveErrorBanner}
            onClick={() => setLocalSaveError("")}
            role="alert"
          >
            Local save failed · {localSaveError} · tap to dismiss
          </button>
        )}

        <main className={`${styles.content} ${!online || localSaveError ? styles.contentWithBanner : ""}`}>
          <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
        </main>

        {bottomAction && <footer className={styles.footer}>{bottomAction}</footer>}
      </div>
    </div>
  );
}
