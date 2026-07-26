import { apiClient } from "./client";

export const statsApi = {
  // GET /stats/player/{playerId}?seasonId=
  getPlayerProfile: (playerId, seasonId) =>
    apiClient.get(`/stats/player/${encodeURIComponent(playerId)}`, { seasonId }),

  // GET /stats/team/{teamId}?seasonId=
  getTeamProfile: (teamId, seasonId) =>
    apiClient.get(`/stats/team/${encodeURIComponent(teamId)}`, { seasonId }),

  // GET /stats/leaderboard/batting
  getBattingLeaderboard: (filters = {}) => apiClient.get(`/stats/leaderboard/batting`, filters),

  // GET /stats/leaderboard/bowling
  getBowlingLeaderboard: (filters = {}) => apiClient.get(`/stats/leaderboard/bowling`, filters),

  // GET /stats/leaderboard/fielding
  getFieldingLeaderboard: (filters = {}) => apiClient.get(`/stats/leaderboard/fielding`, filters),

  // GET /stats/leaderboard/teams
  getTeamLeaderboard: (filters = {}) => apiClient.get(`/stats/leaderboard/teams`, filters),

  getRivalryStats: (params) => apiClient.get(`/stats/rivalry`, params),
  getHeadToHeadStats: (params) => apiClient.get(`/stats/head-to-head/player`, params),
};