import { api } from "../api";
import { invalidateAfterMatchSync } from "../cacheInvalidation";
import { deleteMatch, getAllMatches, saveMatch } from "../storage/matchDB";
import { buildMatchSyncPayload } from "./matchSyncPayload";
import { getMatchIdempotencyKey } from "./matchIdentity";

export const needsSync = (match) =>
  match?.status === "COMPLETED" &&
  (match.syncStatus === "pending" || match.syncStatus === "failed");

export async function getPendingSyncMatches() {
  const all = await getAllMatches();
  return all.filter(needsSync);
}

let inFlight = null;

export function syncPendingMatches() {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const pending = await getPendingSyncMatches();
    let synced = 0;
    let failed = 0;
    const touchedSeasons = new Set();

    for (const match of pending) {
      try {
        await api.matches.createMatch(buildMatchSyncPayload(match), {
          idempotencyKey: getMatchIdempotencyKey(match),
        });
        await deleteMatch(match.id);
        touchedSeasons.add(match.seasonId);
        synced += 1;
      } catch (err) {
        await saveMatch({
          ...match,
          syncStatus: "failed",
          lastSyncAttemptAt: Date.now(),
          lastSyncError: err.message,
        });
        failed += 1;
      }
    }

    await Promise.all(
      [...touchedSeasons].map((seasonId) => invalidateAfterMatchSync(seasonId)),
    );

    return { attempted: pending.length, synced, failed };
  })();

  return inFlight.finally(() => {
    inFlight = null;
  });
}
