import { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useDialogA11y } from "../../hooks/useDialogA11y";

import styles from "./StatsFilterSheet.module.css";

const ALL_VALUE = "All";

export default function StatsFilterSheet(props) {
  if (!props.open || typeof document === "undefined") return null;

  return <StatsFilterDialog {...props} />;
}

function StatsFilterDialog({
  onClose,
  filters,
  selectedFilters,
  onChange,
  title = "Filter leaderboard",
}) {
  const titleId = useId();
  const [draftFilters, setDraftFilters] = useState(() => ({
    ...selectedFilters,
  }));
  const [openField, setOpenField] = useState(null);
  const dialogRef = useDialogA11y(true, onClose);

  const activeFilterCount = useMemo(
    () =>
      filters.reduce((count, filter) => {
        const value = draftFilters?.[filter.key];
        return value && value !== ALL_VALUE ? count + 1 : count;
      }, 0),
    [draftFilters, filters],
  );

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
        ref={dialogRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
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
            data-dialog-autofocus="true"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={19} strokeWidth={2.25} />
          </button>
        </header>

        <div className={styles.filtersGrid}>
          {filters.map((filter) => {
            const selectId = `${titleId}-${filter.key}`;
            const selectedValue = draftFilters[filter.key] ?? ALL_VALUE;
            const selectedOption = filter.options.find((option) =>
              (typeof option === "string" ? option : option.value) === selectedValue,
            );
            const selectedLabel = selectedOption
              ? typeof selectedOption === "string" ? selectedOption : selectedOption.label
              : selectedValue;

            return (
              <div key={filter.key} className={`${styles.field} ${openField === filter.key ? styles.fieldOpen : ""}`}>
                <label className={styles.label} htmlFor={selectId}>
                  {filter.label}
                </label>

                <div className={`${styles.selectWrap} ${openField === filter.key ? styles.selectWrapOpen : ""}`}>
                  <button
                    id={selectId}
                    type="button"
                    className={styles.select}
                    aria-haspopup="listbox"
                    aria-expanded={openField === filter.key}
                    onClick={() => setOpenField((current) => current === filter.key ? null : filter.key)}
                  >
                    <span>{selectedLabel}</span>
                    <ChevronDown className={styles.selectIcon} size={17} strokeWidth={2.25} aria-hidden="true" />
                  </button>
                  {openField === filter.key && (
                    <div className={styles.optionMenu} role="listbox" aria-label={filter.label}>
                      {filter.options.map((option) => {
                        const value = typeof option === "string" ? option : option.value;
                        const label = typeof option === "string" ? option : option.label;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="option"
                            aria-selected={selectedValue === value}
                            className={selectedValue === value ? styles.optionActive : styles.option}
                            onClick={() => { handleSelect(filter.key, value); setOpenField(null); }}
                          >
                            <span>{label}</span>
                            {selectedValue === value && <span className={styles.optionCheck}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
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
