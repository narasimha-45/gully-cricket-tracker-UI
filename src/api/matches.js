import { apiClient } from "./client";

export const matchesApi = {
  getMatch: (id, options) => apiClient.get(`/matches/${encodeURIComponent(id)}`, undefined, options),
  createMatch: (matchData, { idempotencyKey, signal } = {}) =>
    apiClient.post(`/matches`, matchData, {
      signal,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    }),
};
