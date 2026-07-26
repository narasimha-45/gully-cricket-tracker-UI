import { apiClient } from "./client";

export const searchApi = {
  // GET /api/search?query=
  globalSearch: (query) => apiClient.get(`/search`, { query }),
};
