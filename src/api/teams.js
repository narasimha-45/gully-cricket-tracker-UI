import { apiClient } from "./client";

export const teamsApi = {
  // GET /teams/search?query=
  searchTeams: (query) => apiClient.get(`/teams/search`, { query }),

  // GET /teams/season-player?teamId=&seasonId=
  getTeamSeasonPlayers: (teamId, seasonId) =>
    apiClient.get(`/teams/season-player`, { teamId, seasonId }),

  getTeams: (seasonId) => apiClient.get("/teams/get-teams", { seasonId }),
};
