import { useEffect, useMemo, useRef, useState } from "react";
import { Check, LoaderCircle, Search, X } from "lucide-react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePlayerSearch } from "../hooks/queries";
import { formatName } from "../utils/helpers";
import styles from "./PlayerAutocomplete.module.css";

const playerId = (player) => player?.playerId || player?.id || player?._id || "";
const playerName = (player) => player?.playerName || player?.displayName || player?.name || "";

export default function PlayerAutocomplete({ label, value, onChange, excludeId }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const debouncedText = useDebouncedValue(text.trim(), 250);
  const query = usePlayerSearch(debouncedText);
  const results = useMemo(
    () => (query.data || []).filter((player) => playerId(player) !== excludeId),
    [excludeId, query.data],
  );

  useEffect(() => {
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const select = (player) => {
    onChange(player);
    setText("");
    setOpen(false);
  };

  return (
    <div className={styles.field} ref={containerRef}>
      <label className={styles.label}>{label}</label>
      {value ? (
        <div className={styles.selected}>
          <span className={styles.avatar}>{formatName(playerName(value)).slice(0, 1)}</span>
          <strong>{formatName(playerName(value))}</strong>
          <button type="button" onClick={() => onChange(null)} aria-label={`Remove ${label}`}><X size={15} /></button>
        </div>
      ) : (
        <div className={styles.inputWrap}>
          <Search size={15} aria-hidden="true" />
          <input
            value={text}
            placeholder="Type a player name"
            onFocus={() => setOpen(true)}
            onChange={(event) => { setText(event.target.value); setOpen(true); }}
          />
          {query.isFetching && <LoaderCircle className={styles.spinner} size={15} />}
        </div>
      )}
      {open && !value && text.trim().length >= 2 && (
        <div className={styles.dropdown} role="listbox">
          {results.map((player) => (
            <button type="button" key={playerId(player) || playerName(player)} onClick={() => select(player)}>
              <span className={styles.avatar}>{formatName(playerName(player)).slice(0, 1)}</span>
              <span>{formatName(playerName(player))}</span>
              <Check size={14} aria-hidden="true" />
            </button>
          ))}
          {!query.isFetching && results.length === 0 && <p>No matching players</p>}
        </div>
      )}
    </div>
  );
}