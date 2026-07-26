import { useState } from "react";
import styles from "./CreateSeasonModal.module.css";
import { api, ApiError } from "../api";

export default function CreateSeasonModal({
  open,
  onClose,
  onCreated,
  existingSeasons = [],
}) {
  const [name, setName] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const isDuplicate = existingSeasons.some(
    (s) => s.seasonName.toLowerCase() === name.trim().toLowerCase(),
  );

  const handleClose = () => {
    setName("");
    setSubmitError(null);
    onClose();
  };

  const createSeason = async () => {
    if (!name.trim() || isDuplicate || submitting) return;

    try {
      setSubmitting(true);
      setSubmitError(null);
      await api.seasons.createSeason(name);

      setName("");
      onClose();
      onCreated();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${styles.overlay} motion-backdrop`} onClick={handleClose}>
      <div
        className={`${styles.modal} motion-modal`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.accentBar} />

        <h3 className={styles.heading}>Create Season</h3>
        <p className={styles.subheading}>
          Give this season a name to get started
        </p>

        <div className={styles.fieldWrap}>
          <input
            className={`${styles.input} ${isDuplicate ? styles.inputError : ""}`}
            placeholder="e.g. Summer 2026"
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && createSeason()}
          />
          {isDuplicate && (
            <div className={styles.fieldError}>
              ⚠ This season already exists
            </div>
          )}
          {submitError && !isDuplicate && (
            <div className={styles.fieldError}>{submitError}</div>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={handleClose}>
            Cancel
          </button>
          <button
            className={styles.create}
            onClick={createSeason}
            disabled={!name.trim() || isDuplicate || submitting}
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
