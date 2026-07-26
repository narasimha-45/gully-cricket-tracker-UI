import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

import styles from "./StatsFilterSheet.module.css";

const ALL_VALUE = "All";

export default function StatsFilterSheet({
  open,
  onClose,
  filters,
  selectedFilters,
  onChange,
  title = "Filter leaderboard",
}) {
  const titleId = useId();
  const [draftFilters, setDraftFilters] = useState(selectedFilters);

  useEffect(() => {
    if (open) {
      setDraftFilters(selectedFilters);
    }
  }, [open, selectedFilters]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const activeFilterCount = useMemo(
    () =>
      filters.reduce((count, filter) => {
        const value = draftFilters?.[filter.key];
        return value && value !== ALL_VALUE ? count + 1 : count;
      }, 0),
    [draftFilters, filters],
  );

  if (!open || typeof document === "undefined") return null;

  const handleSelect = (key, value) => {
    setDraftFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    const reset = filters.reduce((result, filter) => {
      result[filter.key] = ALL_VALUE;
      return result;
    }, {});

    setDraftFilters(reset);
  };

  const applyFilters = () => {
    onChange(draftFilters);
    onClose();
  };

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.handle} aria-hidden="true" />

        <header className={styles.header}>
          <div className={styles.heading}>
            <div className={styles.titleRow}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {activeFilterCount > 0 && (
                <span className={styles.activeCount}>
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <p className={styles.subtitle}>Refine the stats shown below.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={19} strokeWidth={2.25} />
          </button>
        </header>

        <div className={styles.filtersGrid}>
          {filters.map((filter) => {
            const selectId = `${titleId}-${filter.key}`;

            return (
              <div key={filter.key} className={styles.field}>
                <label className={styles.label} htmlFor={selectId}>
                  {filter.label}
                </label>

                <div className={styles.selectWrap}>
                  <select
                    id={selectId}
                    value={draftFilters[filter.key] ?? ALL_VALUE}
                    onChange={(event) =>
                      handleSelect(filter.key, event.target.value)
                    }
                    className={styles.select}
                  >
                    {filter.options.map((option) => {
                      const value =
                        typeof option === "string" ? option : option.value;

                      const label =
                        typeof option === "string" ? option : option.label;

                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    className={styles.selectIcon}
                    size={17}
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.clearButton}
            onClick={resetFilters}
            disabled={activeFilterCount === 0}
          >
            Clear all
          </button>

          <button
            type="button"
            className={styles.applyButton}
            onClick={applyFilters}
          >
            Show results
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
