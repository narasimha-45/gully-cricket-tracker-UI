const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, "");

// The backend routes used by this frontend live under /api. Supporting both
// `http://host:port` and `http://host:port/api` in VITE_API_BASE_URL avoids
// accidental `/api/api/...` or missing-prefix requests.
export const BASE_URL = normalizedBaseUrl;

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function unwrapApiData(response) {
  if (
    response &&
    typeof response === "object" &&
    !Array.isArray(response) &&
    Object.prototype.hasOwnProperty.call(response, "data")
  ) {
    return response.data;
  }

  return response;
}

export function getApiMessage(response, fallback = "Request failed") {
  if (!response || typeof response !== "object") return fallback;
  return response.message || response.error || fallback;
}

function buildUrl(path, params) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${BASE_URL}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === "All"
      ) {
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

async function request(
  path,
  { method = "GET", params, body, signal } = {},
) {
  const url = buildUrl(path, params);

  const res = await fetch(url, {
    method,
    signal,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseBody(res);

  if (!res.ok || (data && typeof data === "object" && data.success === false)) {
    const message = getApiMessage(
      data,
      `Request failed with status ${res.status}`,
    );
    throw new ApiError(message, res.status, data);
  }

  return data;
}

export const apiClient = {
  get: (path, params, options) =>
    request(path, { method: "GET", params, ...options }),
  post: (path, body, options) =>
    request(path, { method: "POST", body, ...options }),
};
