const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

let refreshPromise = null;

async function tryRefresh() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      refreshPromise = null;
    });
  }
  const res = await refreshPromise;
  return res.ok;
}

/**
 * Thin wrapper around fetch:
 * - always sends cookies (credentials: "include") since auth lives in httpOnly cookies
 * - on a 401 (except for auth endpoints themselves), tries a single silent refresh
 *   and retries the request once before giving up
 * - throws ApiClientError with the server's message + status + field details
 */
export class ApiClientError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}, { isRetry = false } = {}) {
  const { headers: extraHeaders, ...restOptions } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...restOptions,
    headers: {
      ...(restOptions.body ? { "Content-Type": "application/json" } : {}),
      ...(extraHeaders || {}),
    },
  });

  const isAuthRoute = path.startsWith("/auth/");

  if (res.status === 401 && !isRetry && !isAuthRoute) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request(path, options, { isRetry: true });
    }
  }

  let body = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await res.json().catch(() => null);
  }

  if (!res.ok) {
    throw new ApiClientError(
      body?.message || "Something went wrong. Please try again.",
      res.status,
      body?.details || null
    );
  }

  return body;
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, data, options = {}) =>
    request(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      headers: options.headers,
    }),
  put: (path, data) => request(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  del: (path) => request(path, { method: "DELETE" }),
};
