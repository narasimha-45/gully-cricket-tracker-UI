import { apiClient } from "./client";

export const matchesApi = {
  getMatch: (id) => apiClient.get(`/matches/${encodeURIComponent(id)}`),

  // One completed local match = one stable idempotency key. If the server
  // commits but the response is lost, retries return the existing match.
  createMatch: (matchData, { idempotencyKey, signal } = {}) =>
    apiClient.post(`/matches`, matchData, {
      signal,
      headers: idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : undefined,
    }),
};
