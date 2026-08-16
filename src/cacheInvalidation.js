import { queryClient } from "./queryClient";
import { queryKeys } from "./queryKeys";

/**
 * A completed match changes multiple read models on the backend. Keep cache
 * invalidation in one place so every sync path has the same behavior.
 */
export async function invalidateAfterMatchSync(seasonId) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.seasonMatches(seasonId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.leaderboardRoot }),
    queryClient.invalidateQueries({ queryKey: queryKeys.playerProfileRoot }),
    queryClient.invalidateQueries({ queryKey: queryKeys.teamProfileRoot }),
    queryClient.invalidateQueries({ queryKey: queryKeys.teamsRoot }),
  ]);
}
