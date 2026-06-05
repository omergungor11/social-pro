import type { ApiError, ApiResponse } from "@social-pro/shared-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export class ApiRequestError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(error: ApiError["error"]) {
    super(error.message);
    this.name = "ApiRequestError";
    this.statusCode = error.statusCode;
    this.code = error.code;
    this.details = error.details;
  }
}

type RequestOptions = Omit<RequestInit, "method" | "body">;

type JsonBody = Record<string, unknown> | unknown[];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  // Must use dot notation — Next.js inlines NEXT_PUBLIC_ vars at compile time
  // and does NOT resolve bracket notation like process.env["..."]
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not defined. Add it to your .env.local file."
    );
  }
  return url.replace(/\/$/, "");
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    // Server-side: cookies or headers are handled at the call site if needed
    return null;
  }
  return localStorage.getItem("sp_access_token");
}

function buildHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token !== null && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

/**
 * Parses a response and returns the FULL wrapper ({ data, meta? }).
 * Use when the caller needs pagination metadata (e.g. meta.total for counts).
 */
async function parseWrapped<T>(response: Response): Promise<ApiResponse<T>> {
  // 204 No Content — return an empty wrapper (caller must handle)
  if (response.status === 204) {
    return { data: undefined as unknown as T };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError({
      statusCode: response.status,
      code: "PARSE_ERROR",
      message: `Failed to parse response body (HTTP ${response.status})`,
    });
  }

  if (!response.ok) {
    // Auto-redirect to login on 401 (expired/missing token)
    // Skip redirect if already on login/register pages to avoid infinite loop
    if (response.status === 401 && typeof window !== "undefined") {
      const isAuthPage = window.location.pathname.startsWith("/login") || window.location.pathname.startsWith("/register");
      if (!isAuthPage) {
        localStorage.removeItem("sp_access_token");
        localStorage.removeItem("sp_refresh_token");
        window.location.href = "/login";
        // Return a never-resolving promise to prevent further execution while redirecting
        return new Promise<never>(() => {});
      }
    }

    const errorBody = body as Partial<ApiError>;
    if (errorBody.error) {
      throw new ApiRequestError(errorBody.error);
    }
    throw new ApiRequestError({
      statusCode: response.status,
      code: "UNKNOWN_ERROR",
      message: `Request failed with status ${response.status}`,
    });
  }

  // The API wraps successful responses in { data, meta? }
  return body as ApiResponse<T>;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const wrapped = await parseWrapped<T>(response);
  return wrapped.data;
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

async function request<T>(
  method: string,
  path: string,
  body?: JsonBody,
  options?: RequestOptions
): Promise<T> {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...options,
    method,
    headers: buildHeaders(options?.headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseResponse<T>(response);
}

/**
 * Like request(), but returns the full { data, meta? } wrapper so callers can
 * read pagination metadata (e.g. meta.total).
 */
async function requestRaw<T>(
  method: string,
  path: string,
  body?: JsonBody,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...options,
    method,
    headers: buildHeaders(options?.headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseWrapped<T>(response);
}

// ---------------------------------------------------------------------------
// Public API client
// ---------------------------------------------------------------------------

export const apiClient = {
  /**
   * HTTP GET — fetch a resource or collection.
   * @example const user = await apiClient.get<User>('/auth/me');
   */
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, options);
  },

  /**
   * HTTP GET that preserves the response envelope, including pagination meta.
   * @example const { data, meta } = await apiClient.getWithMeta<Post[]>('/posts');
   */
  getWithMeta<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return requestRaw<T>("GET", path, undefined, options);
  },

  /**
   * HTTP POST — create a resource.
   * @example const post = await apiClient.post<Post>('/posts', payload);
   */
  post<T>(path: string, body?: JsonBody, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, body, options);
  },

  /**
   * HTTP PATCH — partially update a resource.
   * @example const updated = await apiClient.patch<Post>('/posts/1', { title: 'New' });
   */
  patch<T>(
    path: string,
    body?: JsonBody,
    options?: RequestOptions
  ): Promise<T> {
    return request<T>("PATCH", path, body, options);
  },

  /**
   * HTTP DELETE — remove a resource.
   * @example await apiClient.delete('/posts/1');
   */
  delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, undefined, options);
  },
} as const;
