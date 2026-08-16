import { useId } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import styles from "./ConfirmSheet.module.css";

/**
 * App-styled replacement for window.confirm(). Every other destructive/
 * blocking interaction in the app (BottomSheetSelector, WicketSheet,
 * EditMatchSheet) already runs through useDialogA11y for focus trapping,
 * Escape-to-close, and focus restoration — this gives destructive
 * confirmations the same treatment instead of dropping into a native
 * browser dialog.
 */
export default function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onClose,
}) {
  const titleId = useId();
  const descriptionId = useId();
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className={styles.handle} aria-hidden="true" />
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-dialog-autofocus="true"
            className={
              tone === "danger" ? styles.dangerButton : styles.confirmButton
            }
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
