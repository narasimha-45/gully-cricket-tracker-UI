import { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useDialogA11y } from "../../hooks/useDialogA11y";

import styles from "./StatsFilterSheet.module.css";

const ALL_VALUE = "All";
const optionValue = (option) =>
  typeof option === "string" ? option : option.value;
const optionLabel = (option) =>
  typeof option === "string" ? option : option.label;
const asArray = (value) => {
  if (Array.isArray(value)) return value.filter((entry) => entry && entry !== ALL_VALUE);
  return value && value !== ALL_VALUE ? [value] : [];
};

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
        if (filter.multiple) {
          return count + (asArray(value).length > 0 ? 1 : 0);
        }
        return count + (value && value !== ALL_VALUE ? 1 : 0);
      }, 0),
    [draftFilters, filters],
  );

  const handleSelect = (filter, value) => {
    if (!filter.multiple) {
      setDraftFilters((previous) => ({
        ...previous,
        [filter.key]: value,
      }));
      setOpenField(null);
      return;
    }

    setDraftFilters((previous) => {
      const selected = asArray(previous?.[filter.key]);
      if (value === ALL_VALUE) {
        return { ...previous, [filter.key]: [] };
      }

      const exists = selected.some((entry) => String(entry) === String(value));
      return {
        ...previous,
        [filter.key]: exists
          ? selected.filter((entry) => String(entry) !== String(value))
          : [...selected, value],
      };
    });
  };

  const resetFilters = () => {
    const reset = filters.reduce((result, filter) => {
      result[filter.key] = filter.multiple ? [] : ALL_VALUE;
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
            const selectedValue = draftFilters[filter.key] ?? (filter.multiple ? [] : ALL_VALUE);
            const selectedValues = filter.multiple ? asArray(selectedValue) : [];

            let selectedLabel = ALL_VALUE;
            if (filter.multiple && selectedValues.length > 0) {
              const labels = selectedValues.map((value) => {
                const option = filter.options.find(
                  (entry) => String(optionValue(entry)) === String(value),
                );
                return option ? optionLabel(option) : String(value);
              });
              selectedLabel = labels.length <= 2 ? labels.join(", ") : `${labels.length} selected`;
            } else if (!filter.multiple) {
              const selectedOption = filter.options.find(
                (option) => optionValue(option) === selectedValue,
              );
              selectedLabel = selectedOption ? optionLabel(selectedOption) : selectedValue;
            }

            return (
              <div
                key={filter.key}
                className={`${styles.field} ${openField === filter.key ? styles.fieldOpen : ""}`}
              >
                <label className={styles.label} htmlFor={selectId}>
                  {filter.label}
                </label>

                <div
                  className={`${styles.selectWrap} ${openField === filter.key ? styles.selectWrapOpen : ""}`}
                >
                  <button
                    id={selectId}
                    type="button"
                    className={styles.select}
                    aria-haspopup="listbox"
                    aria-expanded={openField === filter.key}
                    onClick={() =>
                      setOpenField((current) =>
                        current === filter.key ? null : filter.key,
                      )
                    }
                  >
                    <span>{selectedLabel}</span>
                    <ChevronDown
                      className={styles.selectIcon}
                      size={17}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  </button>

                  {openField === filter.key && (
                    <div
                      className={styles.optionMenu}
                      role="listbox"
                      aria-label={filter.label}
                      aria-multiselectable={filter.multiple || undefined}
                    >
                      {filter.options.map((option) => {
                        const value = optionValue(option);
                        const label = optionLabel(option);
                        const selected = filter.multiple
                          ? value === ALL_VALUE
                            ? selectedValues.length === 0
                            : selectedValues.some(
                                (entry) => String(entry) === String(value),
                              )
                          : selectedValue === value;

                        return (
                          <button
                            key={value}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={selected ? styles.optionActive : styles.option}
                            onClick={() => handleSelect(filter, value)}
                          >
                            <span>{label}</span>
                            {selected && (
                              <span className={styles.optionCheck}>✓</span>
                            )}
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
