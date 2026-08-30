import { apiClient } from "./client";

export const statsApi = {
  getPlayerProfile: (playerId, filters = {}, options) =>
    apiClient.get(`/stats/player/${encodeURIComponent(playerId)}`, filters, options),

  comparePlayers: (filters = {}, options) =>
    apiClient.get(`/stats/player/compare`, filters, options),

  getTeamProfile: (teamId, filters = {}, options) =>
    apiClient.get(`/stats/team/${encodeURIComponent(teamId)}`, filters, options),


  getBattingLeaderboard: (filters = {}, options) =>
    apiClient.get(`/stats/leaderboard/batting`, filters, options),

  getBowlingLeaderboard: (filters = {}, options) =>
    apiClient.get(`/stats/leaderboard/bowling`, filters, options),

  getFieldingLeaderboard: (filters = {}, options) =>
    apiClient.get(`/stats/leaderboard/fielding`, filters, options),

  getTeamLeaderboard: (filters = {}, options) =>
    apiClient.get(`/stats/leaderboard/teams`, filters, options),

  getPartnershipInnings: (filters = {}, options) =>
    apiClient.get(`/stats/leaderboard/partnerships/innings`, filters, options),

  getAggregatedPartnerships: (filters = {}, options) =>
    apiClient.get(`/stats/leaderboard/partnerships/aggregated`, filters, options),

  getRivalries: (filters = {}, options) =>
    apiClient.get(`/stats/rivalries`, filters, options),
};
