import { useId } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../hooks/useDialogA11y";
import styles from "./MatchPopup.module.css";

export default function MatchPopup({
  open,
  title,
  subtitle,
  scoreline,
  banner,
  primaryText,
  primaryLoadingText = "Working…",
  loading = false,
  onPrimary,
  secondaryText,
  onSecondary,
  tertiaryText,
  onTertiary,
}) {
  const titleId = useId();
  const dialogRef = useDialogA11y(open, undefined);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.overlay}>
      <section
        ref={dialogRef}
        className={styles.card}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? `${titleId}-description` : undefined}
        tabIndex={-1}
      >
        <div className={styles.accentBar} aria-hidden="true" />
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {subtitle && (
          <p id={`${titleId}-description`} className={styles.subtitle}>
            {subtitle}
          </p>
        )}

        {scoreline && (
          <div className={styles.scoreline}>
            <div className={styles.scorelineTeam}>{scoreline.label}</div>

            <div className={styles.scorelineScore}>
              <span className={styles.scorelineRuns}>{scoreline.runs}</span>
              <span className={styles.scorelineDivider} aria-hidden="true">
                /
              </span>
              <span className={styles.scorelineWickets}>
                {scoreline.wickets}
              </span>

              {scoreline.declared && (
                <span className={styles.scorelineBadge}>Declared</span>
              )}
            </div>

            {scoreline.overs && (
              <div className={styles.scorelineOvers}>
                {scoreline.overs} overs
              </div>
            )}
          </div>
        )}

        {banner && (
          <div className={styles.banner} role="note">
            {banner}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            data-dialog-autofocus="true"
            className={styles.primary}
            disabled={loading}
            onClick={onPrimary}
          >
            {loading && <span className={styles.spinner} aria-hidden="true" />}
            <span>{loading ? primaryLoadingText : primaryText}</span>
          </button>

          {secondaryText && onSecondary && (
            <button
              type="button"
              className={styles.secondary}
              disabled={loading}
              onClick={onSecondary}
            >
              {secondaryText}
            </button>
          )}

          {tertiaryText && onTertiary && (
            <button
              type="button"
              className={styles.tertiary}
              disabled={loading}
              onClick={onTertiary}
            >
              {tertiaryText}
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
