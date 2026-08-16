const isDev = import.meta.env.DEV || import.meta.env.VITE_DEBUG === "true";
const SENSITIVE_KEYS = new Set([
  "authorization",
  "password",
  "token",
  "apikey",
  "api-key",
]);
const MAX_DIAGNOSTICS = 200;
const diagnosticBuffer = [];

const sanitize = (value, depth = 0) => {
  if (depth > 4) return "[truncated]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: isDev ? value.stack : undefined,
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => sanitize(item, depth + 1));
  }
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase())
        ? "[redacted]"
        : sanitize(item, depth + 1),
    ]),
  );
};

const remember = (entry) => {
  diagnosticBuffer.push(entry);
  if (diagnosticBuffer.length > MAX_DIAGNOSTICS) diagnosticBuffer.shift();
};

const emit = (level, event, context = {}) => {
  const entry = {
    level,
    event,
    at: new Date().toISOString(),
    context: sanitize(context),
  };

  remember(entry);

  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    window.dispatchEvent?.(
      new CustomEvent("gully:diagnostic", { detail: entry }),
    );
  }

  if (!isDev && level === "debug") return;
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  console[method](`[gully] ${event}`, entry.context);
};

export const logger = {
  debug: (event, context) => emit("debug", event, context),
  info: (event, context) => emit("info", event, context),
  warn: (event, context) => emit("warn", event, context),
  error: (event, context) => emit("error", event, context),
};

export const getDiagnostics = () => diagnosticBuffer.map((entry) => structuredClone(entry));
export const clearDiagnostics = () => diagnosticBuffer.splice(0, diagnosticBuffer.length);

if (isDev && typeof window !== "undefined") {
  Object.defineProperty(window, "__GULLY_DIAGNOSTICS__", {
    configurable: true,
    value: Object.freeze({ get: getDiagnostics, clear: clearDiagnostics }),
  });
}
