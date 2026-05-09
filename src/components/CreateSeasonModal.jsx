import { useState } from "react";
import styles from "./CreateSeasonModal.module.css";
const API = import.meta.env.VITE_API_BASE_URL;

export default function CreateSeasonModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");

  if (!open) return null;

  const createSeason = async () => {
    if (!name.trim()) return;

    await fetch(`${API}/api/seasons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonName: name })
    });

    setName("");
    onClose();
    onCreated();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>Create Season</h3>

        <input
          className={styles.input}
          placeholder="e.g. Summer 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.create} onClick={createSeason}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
