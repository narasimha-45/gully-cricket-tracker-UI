import { api } from "../api";
import { queryClient } from "../queryClient";
import { deleteMatch, saveMatch } from "../storage/matchDB";
import { deepCopy } from "./helpers";
import { buildMatchSyncPayload } from "./matchSyncPayload";
import { getMatchIdempotencyKey } from "./matchIdentity";
import { deriveFieldingStats, calculateManOfTheMatch } from "./statsCalculator";

/**
 * Finalization is local-first:
 * 1) persist the final derived stats + pending sync state locally;
 * 2) attempt one idempotent backend write;
 * 3) remove the local copy only after backend confirmation.
 *
 * Failure still counts as a finished match from the user's perspective. The
 * match remains visible locally with a pending/failed sync state and can retry.
 */
export const acknowledgeMatchResult = async (
  match,
  setMatch,
  setAckSubmitting,
  ackSubmitting,
  onFinished,
) => {
  if (ackSubmitting) return;
  setAckSubmitting(true);

  const fieldingStats = deriveFieldingStats(match);
  const manOfTheMatch = calculateManOfTheMatch(match, fieldingStats);

  const updated = deepCopy(match);
  updated.result.manOfTheMatch = manOfTheMatch;
  updated.fieldingStats = fieldingStats;
  updated.syncStatus = "pending";
  updated.lastSyncError = null;
  updated.ui = { ...(updated.ui || {}), matchResultSeen: true };

  // Never depend on the network to preserve the final score.
  await saveMatch(updated);
  setMatch(updated);

  try {
    await api.matches.createMatch(buildMatchSyncPayload(updated), {
      idempotencyKey: getMatchIdempotencyKey(updated),
    });
    await deleteMatch(updated.id);
    await queryClient.invalidateQueries({
      queryKey: ["seasonMatches", updated.seasonId],
    });
    onFinished?.({ synced: true, match: updated });
    return;
  } catch (err) {
    const failed = {
      ...updated,
      syncStatus: "failed",
      lastSyncAttemptAt: Date.now(),
      lastSyncError: err.message,
    };
    await saveMatch(failed);
    setMatch(failed);
    onFinished?.({ synced: false, match: failed });
  } finally {
    setAckSubmitting(false);
  }
};
