import { apiClient } from "./client";

export const searchApi = {
  globalSearch: (query, options) => apiClient.get(`/api/search`, { query }, options),
};
