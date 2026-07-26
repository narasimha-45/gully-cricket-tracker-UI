import { apiClient } from "./client";

export const statsApi = {
  // GET /api/stats/player/{playerId}
  getPlayerProfile: (playerId) =>
    apiClient.get(`/stats/player/${encodeURIComponent(playerId)}`),

  // GET /api/stats/player/{playerId}/season/{seasonId}
  getPlayerProfileBySeason: (playerId, seasonId) =>
    apiClient.get(
      `/stats/player/${encodeURIComponent(playerId)}/season/${encodeURIComponent(seasonId)}`,
    ),

  // GET /api/stats/team/{teamId}
  getTeamProfile: (teamId, seasonId) =>
    apiClient.get(`/stats/team/${encodeURIComponent(teamId)}`, { seasonId }),

  // GET /api/stats/search/players?q=
  searchPlayers: (query) =>
    apiClient.get(`/stats/search/players`, { q: query }),

  getBattingLeaderboard: (filters = {}) =>
    apiClient.get(`/stats/leaderboard/batting`, filters),

  getBowlingLeaderboard: (filters = {}) =>
    apiClient.get(`/stats/leaderboard/bowling`, filters),

  getFieldingLeaderboard: (filters = {}) =>
    apiClient.get(`/stats/leaderboard/fielding`, filters),

  getTeamLeaderboard: (filters = {}) =>
    apiClient.get(`/stats/leaderboard/teams`, filters),

  getRivalryStats: (params) => apiClient.get(`/stats/rivalry`, params),

  getHeadToHeadStats: (params) =>
    apiClient.get(`/stats/head-to-head/player`, params),
};
