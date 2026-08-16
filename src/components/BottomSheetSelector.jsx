import { useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { formatName } from "../utils/helpers";
import { sameName } from "../utils/matchModel";
import styles from "./BottomSheetSelector.module.css";

export default function BottomSheetSelector({
  open,
  title,
  items,
  disabledItems = [],
  onSelect,
  onClose,
  children,
}) {
  const titleId = useId();
  const dialogRef = useDialogA11y(open, onClose);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
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
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </header>

        <div className={styles.body}>
          {items ? (
            items.length === 0 ? (
              <p className={styles.muted}>No players available</p>
            ) : (
              <div className={styles.itemList}>
                {items.map((player, index) => {
                  const disabled = disabledItems.some((item) =>
                    sameName(item, player),
                  );
                  return (
                    <button
                      type="button"
                      key={player}
                      data-dialog-autofocus={
                        index === 0 && !disabled ? "true" : undefined
                      }
                      className={styles.item}
                      disabled={disabled}
                      onClick={() => onSelect?.(player)}
                    >
                      <span className={styles.avatar} aria-hidden="true">
                        {formatName(player).slice(0, 1).toUpperCase()}
                      </span>
                      <span>{formatName(player)}</span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            children
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
