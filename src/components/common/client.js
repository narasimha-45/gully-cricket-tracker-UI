
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path, params) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      // Skip empty/unset filters (including the "All" sentinel the stats
      // filter sheets use) so we don't send noise like `?team=All`.
      if (value === undefined || value === null || value === "" || value === "All") {
        return;
      }
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, { method = "GET", params, body, signal } = {}) {
  const url = buildUrl(path, params);

  const res = await fetch(url, {
    method,
    signal,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseBody(res);

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data;
}

export const apiClient = {
  get: (path, params, options) => request(path, { method: "GET", params, ...options }),
  post: (path, body, options) => request(path, { method: "POST", body, ...options }),
};