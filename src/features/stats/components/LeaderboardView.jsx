import { Filter, RefreshCw } from "lucide-react";
import EmptyState from "../../../components/common/EmptyState";
import styles from "./LeaderboardView.module.css";

export function LeaderboardToolbar({ activeLabels, onOpenFilters, filtersDisabled, warning }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.filterSummary}>
        {activeLabels.length === 0 && !warning && <span className={styles.allChip}>All results</span>}
        {activeLabels.map((label) => <span key={label} className={styles.filterChip}>{label}</span>)}
        {warning && <span className={styles.warningChip}>{warning}</span>}
      </div>
      <button type="button" className={styles.filterButton} onClick={onOpenFilters} disabled={filtersDisabled} aria-label="Open filters">
        <Filter size={17} />
      </button>
    </div>
  );
}

export function SortButton({ label, column, activeColumn, direction, onSort, ariaLabel }) {
  const active = activeColumn === column;
  return (
    <button type="button" className={`${styles.sortButton} ${active ? styles.activeSort : ""}`} onClick={() => onSort(column)} aria-label={ariaLabel || `Sort by ${label}`}>
      <span>{label}</span>
      {active && <span className={styles.sortDirection}>{direction === "asc" ? "▲" : "▼"}</span>}
    </button>
  );
}

export function LeaderboardState({ loading, fetching, error, empty, onRetry, emptyTitle, emptySubtitle, children }) {
  if (loading && empty) return <StatsSkeleton />;
  if (error && empty) {
    return (
      <div className={styles.errorCard} role="alert">
        <strong>Couldn’t load statistics</strong>
        <span>{error.message || "Check the backend connection and try again."}</span>
        <button type="button" onClick={onRetry}><RefreshCw size={16} /> Retry</button>
      </div>
    );
  }
  if (empty) return <EmptyState title={emptyTitle} subtitle={emptySubtitle} />;
  return (
    <div className={styles.resultsWrap} aria-busy={fetching}>
      {fetching && <div className={styles.refreshing} role="status">Refreshing…</div>}
      {children}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className={styles.skeletonList} role="status" aria-label="Loading statistics">
      <div className={styles.skeletonHeader} />
      {[0, 1, 2, 3, 4].map((row) => (
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
