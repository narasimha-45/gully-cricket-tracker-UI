import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError, api } from "../api";
import { useDialogA11y } from "../hooks/useDialogA11y";
import styles from "./CreateSeasonModal.module.css";

export default function CreateSeasonModal({ open, onClose, onCreated, existingSeasons = [] }) {
  const titleId = useId();
  const dialogRef = useDialogA11y(open, onClose);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open || typeof document === "undefined") return null;

  const trimmedName = name.trim();
  const isDuplicate = existingSeasons.some(
    (season) => season.seasonName?.trim().toLowerCase() === trimmedName.toLowerCase(),
  );
  const validationMessage = isDuplicate ? "A season with this name already exists." : error;
  const canSubmit = Boolean(trimmedName) && !isDuplicate && !submitting;

  const close = () => {
    if (submitting) return;
    setError("");
    onClose();
  };

  const createSeason = async (event) => {
    event?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await api.seasons.createSeason(trimmedName);
      setName("");
      onClose();
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn’t create the season. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h3 id={titleId}>Create season</h3>
        <p className={styles.subtitle}>Give this set of matches a simple name.</p>
        <form onSubmit={createSeason}>
          <label className={styles.label} htmlFor={`${titleId}-name`}>Season name</label>
          <input
            id={`${titleId}-name`}
            data-dialog-autofocus="true"
            className={`${styles.input} ${validationMessage ? styles.inputError : ""}`}
            placeholder="e.g. Summer 2026"
            value={name}
            autoComplete="off"
            onChange={(event) => { setName(event.target.value); setError(""); }}
            aria-invalid={Boolean(validationMessage)}
            aria-describedby={validationMessage ? `${titleId}-error` : undefined}
          />
          {validationMessage && <p id={`${titleId}-error`} className={styles.error} role="alert">{validationMessage}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={close} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.create} disabled={!canSubmit}>{submitting ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
