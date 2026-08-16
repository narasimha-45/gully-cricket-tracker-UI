import { apiClient } from "./client";

export const teamsApi = {
  searchTeams: (query, options) => apiClient.get(`/teams/search`, { query }, options),
  getTeamSeasonPlayers: (teamId, seasonId, options) =>
    apiClient.get(`/teams/season-player`, { teamId, seasonId }, options),
  getTeams: (seasonId, options) =>
    apiClient.get("/teams/get-teams", { seasonId: seasonId === "ALL" ? "All" : seasonId }, options),
};
