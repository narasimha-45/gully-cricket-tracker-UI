import { apiClient } from "./client";


export const playersApi = {
  // GET /players/search?query=
  searchPlayers: (query) => apiClient.get(`/players/search`, { query }),
};