import { CheckCircle2, CloudOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { useNetworkStatus } from "../../../hooks/useNetworkStatus";
import { useMatchSession } from "../state/MatchSessionContext";
import styles from "./MatchPersistenceStatus.module.css";

export default function MatchPersistenceStatus() {
  const online = useNetworkStatus();
  const { persistence } = useMatchSession();

  const isSaving = persistence.status === "saving" || persistence.status === "dirty";
  const isError = persistence.status === "error";

  return (
    <div className={styles.bar} role="status" aria-live="polite">
      <span className={`${styles.item} ${online ? styles.online : styles.offline}`}>
        {online ? <CheckCircle2 size={14} /> : <CloudOff size={14} />}
        {online ? "Online" : "Offline"}
      </span>
      <span className={`${styles.item} ${isError ? styles.error : ""}`}>
        {isSaving ? (
          <LoaderCircle className={styles.spin} size={14} />
        ) : isError ? (
          <TriangleAlert size={14} />
        ) : (
          <CheckCircle2 size={14} />
        )}
        {isSaving ? "Saving locally…" : isError ? "Save failed" : "Saved locally"}
      </span>
    </div>
  );
}
