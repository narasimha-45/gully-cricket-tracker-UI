import { apiClient } from "./client";


export const matchesApi = {
  // GET /matches/{id}
  getMatch: (id) => apiClient.get(`/matches/${encodeURIComponent(id)}`),

  // POST /matches/create
  createMatch: (matchData) => apiClient.post(`/matches/create`, matchData),
};