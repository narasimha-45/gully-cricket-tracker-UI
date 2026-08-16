import { useQuery } from "@tanstack/react-query";
import { api, unwrapApiData } from "../api";

/**
 * Central place for React Query keys + fetchers. Import these instead of
 * hand-rolling useEffect/useState/try-catch/finally in every page — see
 * pages/Home.jsx, pages/MatchSummary.jsx, pages/AnalyticsOverview.jsx for
 * the converted pattern, and the notes at the bottom of this file for the
 * pages still on the old pattern.
 *
 * Every hook here returns the standard React Query shape:
 *   { data, isLoading, isError, error, refetch }
 */

export function useSeasons() {
  return useQuery({
    queryKey: ["seasons"],
    queryFn: async () => unwrapApiData(await api.seasons.getAllSeasons()) || [],
  });
}

export function useSeasonMatches(seasonId) {
  return useQuery({
    queryKey: ["seasonMatches", seasonId],
    queryFn: async () =>
      unwrapApiData(await api.seasons.getSeasonMatches(seasonId)) || [],
    enabled: Boolean(seasonId),
  });
}

// Completed match, read from the backend — this is the source of truth
// once a match has synced (see utils/acknowledgeMatchResult.js, which
// deletes the local copy on a successful sync).
export function useServerMatch(matchId) {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: () => api.matches.getMatch(matchId),
    enabled: Boolean(matchId),
  });
}

export function useBattingLeaderboard(filters = {}) {
  return useQuery({
    queryKey: ["battingLeaderboard", filters],
    queryFn: async () =>
      unwrapApiData(await api.stats.getBattingLeaderboard(filters)) || [],
  });
}

export function useBowlingLeaderboard(filters = {}) {
  return useQuery({
    queryKey: ["bowlingLeaderboard", filters],
    queryFn: async () =>
      unwrapApiData(await api.stats.getBowlingLeaderboard(filters)) || [],
  });
}

export function useFieldingLeaderboard(filters = {}) {
  return useQuery({
    queryKey: ["fieldingLeaderboard", filters],
    queryFn: async () =>
      unwrapApiData(await api.stats.getFieldingLeaderboard(filters)) || [],
  });
}

export function useTeamLeaderboard(filters = {}) {
  return useQuery({
    queryKey: ["teamLeaderboard", filters],
    queryFn: async () =>
      unwrapApiData(await api.stats.getTeamLeaderboard(filters)) || [],
  });
}

export function usePlayerProfile(playerId, seasonId) {
  return useQuery({
    queryKey: ["playerProfile", playerId, seasonId],
    queryFn: () =>
      seasonId
        ? api.stats.getPlayerProfileBySeason(playerId, seasonId)
        : api.stats.getPlayerProfile(playerId),
    enabled: Boolean(playerId),
  });
}

export function useTeamProfile(teamId, seasonId) {
  return useQuery({
    queryKey: ["teamProfile", teamId, seasonId],
    queryFn: () => api.stats.getTeamProfile(teamId, seasonId),
    enabled: Boolean(teamId),
  });
}

export function useTeamsForSeason(seasonId) {
  return useQuery({
    queryKey: ["teams", seasonId],
    queryFn: async () =>
      unwrapApiData(await api.teams.getTeams(seasonId)) || [],
    enabled: Boolean(seasonId),
  });
}

/**
 * NOT converted yet — same recipe applies when you get to them:
 *
 *  - SeasonMatches.jsx: has both a local (IndexedDB) list and a server
 *    list side by side. Server half -> useSeasonMatches(seasonId) above.
 *    Local half can also move to useQuery with a plain async queryFn
 *    calling getMatchesBySeason(seasonId) — React Query works fine over
 *    non-HTTP async functions, it just gives you the same loading/error/
 *    cache shape instead of manual useState wiring.
 *  - BattingStats.jsx / BowlingStats.jsx / MiscStats.jsx / TeamStats.jsx:
 *    already fetch leaderboards on mount with useEffect — swap for the
 *    matching hook above, plus useTeamsForSeason for the team filter list.
 *  - PlayerProfilePlaceholder.jsx / TeamProfilePlaceholder.jsx: swap for
 *    usePlayerProfile / useTeamProfile, plus useSeasons for the season
 *    picker.
 *  - InsightsHub.jsx: swap its season-list fetch for useSeasons().
 *  - MatchupsPlaceholder.jsx / GlobalSearch.jsx / TeamSearch.jsx: these
 *    are debounced search-as-you-type, not fetch-on-mount. Same idea
 *    still applies — queryKey: ["searchPlayers", debouncedQuery], enabled:
 *    debouncedQuery.length > 0 — but debounce the query *value* (e.g. with
 *    a small useDebouncedValue hook) before it reaches the key, rather
 *    than debouncing the fetch call itself.
 *  - LiveMatch.jsx / TossPage.jsx / TeamPlayers.jsx: read the LIVE match
 *    from local IndexedDB, not the backend — leave these on getMatch()
 *    from storage/matchDB.js. Wrapping the local read in useQuery is
 *    optional polish, not required, since there's no network/cache
 *    problem to solve there.
 */
