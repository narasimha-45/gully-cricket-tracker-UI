import { useState } from "react";
import styles from "./CreateSeasonModal.module.css";
import { api, ApiError } from "../api";

export default function CreateSeasonModal({ open, onClose, onCreated, existingSeasons = [] }) {
  const [name, setName] = useState("");

  if (!open) return null;

  const isDuplicate = existingSeasons.some(s => 
    s.seasonName.toLowerCase() === name.trim().toLowerCase()
  );

  const createSeason = async () => {
    if (!name.trim() || isDuplicate) return;

    try {
      await api.seasons.createSeason(name);

      setName("");
      onClose();
      onCreated();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      alert(message);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>Create Season</h3>

        <div style={{ position: "relative" }}>
          <input
            className={styles.input}
            style={{ 
              borderColor: isDuplicate ? "var(--color-red-500)" : undefined,
              marginBottom: isDuplicate ? 20 : 10
            }}
            placeholder="e.g. Summer 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {isDuplicate && (
            <div style={{ 
              position: "absolute", 
              bottom: 0, 
              left: 0, 
              color: "var(--color-red-500)", 
              fontSize: 11, 
              fontWeight: 600 
            }}>
              ⚠️ This season already exists
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button 
            className={styles.create} 
            onClick={createSeason}
            disabled={!name.trim() || isDuplicate}
            style={{ opacity: (!name.trim() || isDuplicate) ? 0.5 : 1, cursor: (!name.trim() || isDuplicate) ? "not-allowed" : "pointer" }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
