import { api } from "../../../api";
import { invalidateAfterMatchSync } from "../../../cacheInvalidation";
import { deleteMatch, saveMatch } from "../../../storage/matchDB";
import { deepCopy } from "../../../utils/helpers";
import { getMatchIdempotencyKey } from "../../../utils/matchIdentity";
import { buildMatchSyncPayload } from "../../../utils/matchSyncPayload";
import {
  calculateManOfTheMatch,
  deriveFieldingStats,
} from "../../../utils/statsCalculator";
import { logger } from "../../../observability/logger";
import { MATCH_ACTIONS } from "../state/matchActions";

export async function finalizeAndSyncMatch({ match, dispatch }) {
  const fieldingStats = deriveFieldingStats(match);
  const manOfTheMatch = calculateManOfTheMatch(match, fieldingStats);
  const updated = deepCopy(match);

  updated.result = {
    ...(updated.result || {}),
    manOfTheMatch,
  };
  updated.fieldingStats = fieldingStats;
  updated.syncStatus = "pending";
  updated.lastSyncError = null;
  updated.ui = { ...(updated.ui || {}), matchResultSeen: true };
  updated.updatedAt = Date.now();

  // Durability first. Network is never allowed to own the final score.
  await saveMatch(updated);
  dispatch({
    type: MATCH_ACTIONS.REPLACE_PERSISTED_MATCH,
    payload: updated,
    savedAt: Date.now(),
  });

  try {
    await api.matches.createMatch(buildMatchSyncPayload(updated), {
      idempotencyKey: getMatchIdempotencyKey(updated),
    });
    await deleteMatch(updated.id);
    await invalidateAfterMatchSync(updated.seasonId);
    logger.info("match.sync.completed", {
      localMatchId: updated.id,
      seasonId: updated.seasonId,
    });
    return { synced: true, match: updated };
  } catch (error) {
    const failed = {
      ...updated,
      syncStatus: "failed",
      lastSyncAttemptAt: Date.now(),
      lastSyncError: error?.message || "Sync failed",
    };
    await saveMatch(failed);
    dispatch({
      type: MATCH_ACTIONS.REPLACE_PERSISTED_MATCH,
      payload: failed,
      savedAt: Date.now(),
    });
    logger.warn("match.sync.deferred", {
      localMatchId: failed.id,
      seasonId: failed.seasonId,
      error,
    });
    return { synced: false, match: failed, error };
  }
}
