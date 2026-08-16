import { Filter, RefreshCw } from "lucide-react";
import EmptyState from "../../../components/common/EmptyState";
import styles from "./LeaderboardView.module.css";

export function LeaderboardToolbar({
  activeLabels,
  onOpenFilters,
  filtersDisabled,
  warning,
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.filterSummary} aria-label="Active filters">
        {activeLabels.length === 0 && !warning && (
          <span className={styles.allChip}>All players</span>
        )}
        {activeLabels.map((label) => (
          <span key={label} className={styles.filterChip}>
            {label}
          </span>
        ))}
        {warning && <span className={styles.warningChip}>{warning}</span>}
      </div>
      <button
        type="button"
        className={styles.filterButton}
        onClick={onOpenFilters}
        disabled={filtersDisabled}
        aria-label="Open filters"
      >
        <Filter size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}

export function SortButton({
  label,
  column,
  activeColumn,
  direction,
  onSort,
  ariaLabel,
}) {
  const active = activeColumn === column;
  return (
    <button
      type="button"
      className={`${styles.sortButton} ${active ? styles.activeSort : ""}`}
      onClick={() => onSort(column)}
      aria-label={ariaLabel || `Sort by ${label}`}
    >
      <span>{label}</span>
      {active && (
        <span className={styles.sortDirection} aria-hidden="true">
          {direction === "asc" ? "▲" : "▼"}
        </span>
      )}
    </button>
  );
}

/**
 * Keeps already-rendered statistics on screen during a background refetch.
 * Background network activity is deliberately silent: it is implementation
 * detail, not a user task. aria-busy still exposes the state to assistive tech.
 */
export function LeaderboardState({
  loading,
  fetching,
  error,
  empty,
  onRetry,
  emptyTitle,
  emptySubtitle,
  children,
}) {
  if (loading && empty) return <StatsSkeleton />;
  if (error && empty) {
    return (
      <div className={styles.errorCard} role="alert">
        <strong>Couldn’t load statistics</strong>
        <span>
          {error.message || "Check the backend connection and try again."}
        </span>
        <button type="button" onClick={onRetry}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }
  if (empty) return <EmptyState title={emptyTitle} subtitle={emptySubtitle} />;
  return (
    <div className={styles.resultsWrap} aria-busy={Boolean(fetching)}>
      {children}
    </div>
  );
}

export function StatsSkeleton({ rows = 5, compact = false }) {
  return (
    <div
      className={`${styles.skeletonList} ${compact ? styles.compactSkeleton : ""}`}
      role="status"
      aria-label="Loading statistics"
    >
      {Array.from({ length: rows }, (_, row) => (
        <div className={styles.skeletonRow} key={row}>
          <span className={styles.skeletonRank} />
          <span className={styles.skeletonCopy}>
            <span className={styles.skeletonName} />
            <span className={styles.skeletonMeta} />
          </span>
          <span className={styles.skeletonStat} />
        </div>
      ))}
      <span className={styles.srOnly}>Loading statistics…</span>
    </div>
  );
}
