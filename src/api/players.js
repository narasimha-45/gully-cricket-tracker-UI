import { apiClient } from "./client";

export const playersApi = {
  searchPlayers: (query, options) => apiClient.get(`/players/search`, { query }, options),
};
