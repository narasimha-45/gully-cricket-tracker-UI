const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, "");
export const BASE_URL = normalizedBaseUrl;

const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(message, status, body, cause) {
    super(message, cause ? { cause } : undefined);
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
  {
    method = "GET",
    params,
    body,
    signal,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {},
) {
  const url = buildUrl(path, params);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  const abortFromCaller = () => controller.abort(signal?.reason);

  if (signal) {
    if (signal.aborted) abortFromCaller();
    else signal.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    const requestHeaders = new Headers(headers);
    if (body !== undefined && !requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }

    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: requestHeaders,
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
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError(
        signal?.aborted ? "Request cancelled" : "Request timed out",
        0,
        null,
        error,
      );
    }
    throw new ApiError("Network request failed", 0, null, error);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener?.("abort", abortFromCaller);
  }
}

export const apiClient = {
  get: (path, params, options) =>
    request(path, { method: "GET", params, ...options }),
  post: (path, body, options) =>
    request(path, { method: "POST", body, ...options }),
};
