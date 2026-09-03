import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, unwrapApiData } from "../api";
import { queryKeys } from "../queryKeys";

const asArray = (response) => {
  const data = unwrapApiData(response);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.players)) return data.players;
  return [];
};

const leaderboardOptions = {
  // Match finalization explicitly invalidates statistic queries, so a longer
  // freshness window avoids pointless background refetches while users switch
  // between Overview/Batting/Bowling tabs.
  staleTime: 2 * 60_000,
  gcTime: 10 * 60_000,
  retry: 1,
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: false,
};

export function useSeasons() {
  return useQuery({
    queryKey: queryKeys.seasons,
    queryFn: async ({ signal }) =>
      asArray(await api.seasons.getAllSeasons({ signal })),
    staleTime: 60_000,
  });
}

export function useSeasonMatches(seasonId) {
  return useQuery({
    queryKey: queryKeys.seasonMatches(seasonId),
    queryFn: async ({ signal }) =>
      asArray(await api.seasons.getSeasonMatches(seasonId, { signal })),
    enabled: Boolean(seasonId),
    staleTime: 15_000,
  });
}

export function useLiveSeasonMatches(seasonId) {
  return useQuery({
    queryKey: queryKeys.liveSeasonMatches(seasonId),
    queryFn: async ({ signal }) =>
      asArray(await api.matches.getLiveMatches(seasonId, { signal })),
    enabled: Boolean(seasonId),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useServerMatch(matchId) {
  return useQuery({
    queryKey: queryKeys.match(matchId),
    queryFn: ({ signal }) => api.matches.getMatch(matchId, { signal }),
    enabled: Boolean(matchId),
  });
}

export function useBattingLeaderboard(filters = {}) {
  return useQuery({
    queryKey: queryKeys.leaderboard("batting", filters),
    queryFn: async ({ signal }) =>
      asArray(await api.stats.getBattingLeaderboard(filters, { signal })),
    ...leaderboardOptions,
  });
}

export function useBowlingLeaderboard(filters = {}) {
  return useQuery({
    queryKey: queryKeys.leaderboard("bowling", filters),
    queryFn: async ({ signal }) =>
      asArray(await api.stats.getBowlingLeaderboard(filters, { signal })),
    ...leaderboardOptions,
  });
}

export function useFieldingLeaderboard(filters = {}) {
  return useQuery({
    queryKey: queryKeys.leaderboard("fielding", filters),
    queryFn: async ({ signal }) =>
      asArray(await api.stats.getFieldingLeaderboard(filters, { signal })),
    ...leaderboardOptions,
  });
}

export function useTeamLeaderboard(filters = {}) {
  return useQuery({
    queryKey: queryKeys.leaderboard("teams", filters),
    queryFn: async ({ signal }) =>
      asArray(await api.stats.getTeamLeaderboard(filters, { signal })),
    ...leaderboardOptions,
  });
}

export function usePartnerships(view, filters = {}) {
  return useQuery({
    queryKey: queryKeys.partnerships(view, filters),
    queryFn: async ({ signal }) =>
      asArray(
        await (view === "aggregated"
          ? api.stats.getAggregatedPartnerships(filters, { signal })
          : api.stats.getPartnershipInnings(filters, { signal })),
      ),
    ...leaderboardOptions,
  });
}

export function useRivalries(filters = {}) {
  return useQuery({
    queryKey: queryKeys.rivalries(filters),
    queryFn: async ({ signal }) =>
      asArray(await api.stats.getRivalries(filters, { signal })),
    ...leaderboardOptions,
  });
}

export function usePlayerComparison(filters = {}) {
  return useQuery({
    queryKey: queryKeys.playerComparison(filters),
    queryFn: async ({ signal }) =>
      unwrapApiData(await api.stats.comparePlayers(filters, { signal })),
    enabled: Boolean(filters.player1Id && filters.player2Id),
    ...leaderboardOptions,
  });
}

export function usePlayerProfile(playerId, seasonId, matchType) {
  return useQuery({
    queryKey: queryKeys.playerProfile(playerId, seasonId, matchType),
    queryFn: ({ signal }) =>
      api.stats.getPlayerProfile(playerId, { seasonId, matchType }, { signal }),
    enabled: Boolean(playerId),
    staleTime: 30_000,
  });
}

export function useTeamProfile(teamId, seasonId, matchType) {
  return useQuery({
    queryKey: queryKeys.teamProfile(teamId, seasonId, matchType),
    queryFn: ({ signal }) =>
      api.stats.getTeamProfile(teamId, { seasonId, matchType }, { signal }),
    enabled: Boolean(teamId),
    staleTime: 30_000,
  });
}

export function useTeamsForSeason(seasonId) {
  return useQuery({
    queryKey: queryKeys.teams(seasonId),
    queryFn: async ({ signal }) =>
      asArray(await api.teams.getTeams(seasonId || "ALL", { signal })),
    enabled: Boolean(seasonId),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useGlobalSearch(query) {
  const normalized = query?.trim() || "";
  return useQuery({
    queryKey: queryKeys.globalSearch(normalized),
    queryFn: ({ signal }) => api.search.globalSearch(normalized, { signal }),
    enabled: normalized.length >= 2,
    staleTime: 30_000,
    retry: 0,
  });
}

export function useTeamSearch(query) {
  const normalized = query?.trim() || "";
  return useQuery({
    queryKey: queryKeys.teamSearch(normalized),
    queryFn: async ({ signal }) =>
      asArray(await api.teams.searchTeams(normalized, { signal })),
    enabled: normalized.length >= 2,
    staleTime: 30_000,
    retry: 0,
  });
}

export function usePlayerSearch(query) {
  const normalized = query?.trim() || "";
  return useQuery({
    queryKey: queryKeys.playerSearch(normalized),
    queryFn: async ({ signal }) =>
      asArray(await api.players.searchPlayers(normalized, { signal })),
    enabled: normalized.length >= 2,
    staleTime: 30_000,
    retry: 0,
  });
}

export function useTeamSeasonPlayers(teamId, seasonId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.teamSeasonPlayers(teamId, seasonId),
    queryFn: async ({ signal }) =>
      asArray(
        await api.teams.getTeamSeasonPlayers(teamId, seasonId, { signal }),
      ),
    enabled: Boolean(enabled && teamId && seasonId),
    staleTime: 60_000,
    retry: 1,
  });
}
