import { apiClient } from "./client";


export const seasonsApi = {
  // GET /seasons
  getAllSeasons: () => apiClient.get(`/seasons`),

  // GET /seasons/{seasonId}
  getSeason: (seasonId) => apiClient.get(`/seasons/${encodeURIComponent(seasonId)}`),

  // POST /seasons/create  body: { seasonName }
  createSeason: (seasonName) => apiClient.post(`/seasons/create`, { seasonName }),

  // GET /seasons/matches/{seasonId}
  getSeasonMatches: (seasonId) => apiClient.get(`/seasons/matches/${encodeURIComponent(seasonId)}`),

  // GET /seasons/search?query=
  searchSeasons: (query) => apiClient.get(`/seasons/search`, { query }),
};