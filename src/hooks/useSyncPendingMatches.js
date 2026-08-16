import { useCallback, useEffect, useState } from "react";
import { getPendingSyncMatches, syncPendingMatches } from "../utils/syncPendingMatches";

/**
 * Drives the background sync queue and exposes just enough state for a
 * small "N matches not yet synced" indicator + manual retry button.
 */
export function useSyncPendingMatches() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    const pending = await getPendingSyncMatches();
    setPendingCount(pending.length);
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncPendingMatches();
    } finally {
      setSyncing(false);
      await refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    runSync();
    window.addEventListener("online", runSync);
    window.addEventListener("gully:matches-changed", refreshCount);
    return () => {
      window.removeEventListener("online", runSync);
      window.removeEventListener("gully:matches-changed", refreshCount);
    };
  }, [refreshCount, runSync]);

  return { pendingCount, syncing, retryNow: runSync };
}
