import { apiClient } from "./client";

export const seasonsApi = {
  getAllSeasons: (options) => apiClient.get(`/seasons`, undefined, options),
  getSeason: (seasonId, options) => apiClient.get(`/seasons/${encodeURIComponent(seasonId)}`, undefined, options),
  createSeason: (seasonName, options) => apiClient.post(`/seasons/create`, { seasonName }, options),
  getSeasonMatches: (seasonId, options) => apiClient.get(`/seasons/matches/${encodeURIComponent(seasonId)}`, undefined, options),
  searchSeasons: (query, options) => apiClient.get(`/seasons/search`, { query }, options),
};
