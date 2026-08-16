import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ErrorBoundary from "./common/ErrorBoundary";
import { useSyncPendingMatches } from "../hooks/useSyncPendingMatches";
import styles from "./AppShell.module.css";

export default function AppShell({ title, children, bottomAction }) {
  const { pendingCount, syncing, retryNow } = useSyncPendingMatches();
  const location = useLocation();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [localSaveError, setLocalSaveError] = useState("");

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleLocalSaveError = (event) =>
      setLocalSaveError(event.detail?.message || "Unable to save this match on this device.");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("gully:local-save-error", handleLocalSaveError);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("gully:local-save-error", handleLocalSaveError);
    };
  }, []);

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

            <span className={styles.title}>Gully Cricket</span>
          </div>

          {pendingCount > 0 && (
            <button
              type="button"
              className={styles.syncBadge}
              onClick={retryNow}
              disabled={syncing}
              aria-live="polite"
            >
              <span
                className={`${styles.syncDot} ${syncing ? styles.syncing : ""}`}
              />
              {syncing
                ? "Syncing…"
                : `${pendingCount} match${pendingCount === 1 ? "" : "es"} not synced`}
            </button>
          )}
        </header>

        {!online && (
          <div className={styles.offlineBanner} role="status">
            Offline · live scoring remains on this device
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
          {/* key={pathname} means navigating to a new screen remounts a
              fresh boundary, so a crash on one page can't linger onto
              the next one after the user taps "Try again" or navigates away. */}
          <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
        </main>

        {bottomAction && (
          <footer className={styles.footer}>{bottomAction}</footer>
        )}
      </div>
    </div>
  );
}
