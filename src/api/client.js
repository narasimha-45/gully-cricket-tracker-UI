import { logger } from "../observability/logger";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, "");
export const BASE_URL = normalizedBaseUrl;

const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15_000);

export class ApiError extends Error {
  constructor(message, { status = 0, body = null, cause, requestId, path } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.requestId = requestId;
    this.path = path;
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
  return response.message || response.detail || response.error || fallback;
}

function buildUrl(path, params) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = normalizedBaseUrl.startsWith("http")
    ? normalizedBaseUrl
    : `${window.location.origin}${normalizedBaseUrl.startsWith("/") ? "" : "/"}${normalizedBaseUrl}`;
  const url = new URL(`${base}${normalizedPath}`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "All") return;
    url.searchParams.append(key, String(value));
  });
  return url.toString();
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  const requestId = createRequestId();
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);
  const abortFromCaller = () => controller.abort(signal?.reason || new DOMException("Request cancelled", "AbortError"));

  if (signal) {
    if (signal.aborted) abortFromCaller();
    else signal.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    const requestHeaders = new Headers(headers);
    requestHeaders.set("Accept", "application/json");
    requestHeaders.set("X-Request-Id", requestId);
    if (body !== undefined && !requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }

    logger.debug("api.request.started", { requestId, method, path });
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await parseBody(response);
    const durationMs = Math.round(performance.now() - startedAt);

    if (!response.ok || (data && typeof data === "object" && data.success === false)) {
      const message = getApiMessage(data, `Request failed with status ${response.status}`);
      throw new ApiError(message, {
        status: response.status,
        body: data,
        requestId,
        path,
      });
    }

    logger.debug("api.request.completed", {
      requestId,
      method,
      path,
      status: response.status,
      durationMs,
    });
    return data;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    if (error instanceof ApiError) {
      logger.warn("api.request.failed", { requestId, method, path, durationMs, error });
      throw error;
    }

    const callerCancelled = Boolean(signal?.aborted);
    if (callerCancelled) {
      // React Query intentionally cancels abandoned requests during route changes
      // and React StrictMode's development remount. This is expected control flow,
      // not a network failure, so keep it out of warning/error telemetry.
      logger.debug("api.request.cancelled", { requestId, method, path, durationMs });
      throw error;
    }

    const timedOut = controller.signal.aborted;
    const apiError = new ApiError(
      timedOut ? "Request timed out" : "Network request failed",
      { status: 0, cause: error, requestId, path },
    );
    logger.warn("api.request.failed", { requestId, method, path, durationMs, error: apiError });
    throw apiError;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener?.("abort", abortFromCaller);
  }
}

export const apiClient = {
  get: (path, params, options) => request(path, { method: "GET", params, ...options }),
  post: (path, body, options) => request(path, { method: "POST", body, ...options }),
  put: (path, body, options) => request(path, { method: "PUT", body, ...options }),
  patch: (path, body, options) => request(path, { method: "PATCH", body, ...options }),
  delete: (path, options) => request(path, { method: "DELETE", ...options }),
};
