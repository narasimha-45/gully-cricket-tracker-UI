import { apiClient } from "./client";

export const matchesApi = {
  getLiveMatches: (seasonId, options) =>
    apiClient.get(`/live-matches`, { seasonId }, options),
  getLiveMatch: (id, options) =>
    apiClient.get(`/live-matches/${encodeURIComponent(id)}`, undefined, options),
  endLiveMatch: (id, scorerToken, snapshot, options = {}) =>
    apiClient.post(`/live-matches/${encodeURIComponent(id)}/end`, snapshot, {
      ...options,
      headers: {
        ...(options.headers || {}),
        "X-Live-Scorer-Token": scorerToken,
      },
    }),
  getMatch: (id, options) => apiClient.get(`/matches/${encodeURIComponent(id)}`, undefined, options),
  createMatch: (matchData, { idempotencyKey, signal } = {}) =>
    apiClient.post(`/matches`, matchData, {
      signal,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    }),
};
