/**
 * Retry a promise-returning function with exponential backoff + jitter.
 *
 * Used for outbound social platform API calls (publishing, analytics fetch)
 * that can fail transiently with rate-limit (429) or server (5xx) errors.
 * Non-transient errors (e.g. validation, auth) are rethrown immediately so we
 * don't waste attempts on permanent failures.
 */

export interface RetryOptions {
  /** Maximum number of *additional* attempts after the first (default 3). */
  retries?: number;
  /** Base delay in milliseconds for the first backoff (default 500). */
  baseDelayMs?: number;
  /** Upper bound for any single backoff delay (default 8000). */
  maxDelayMs?: number;
  /** Decide whether a thrown error is worth retrying (default: transient HTTP). */
  isRetryable?: (err: unknown) => boolean;
  /** Called before each retry sleep — useful for logging. */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Best-effort detection of transient (retryable) errors. Looks at common
 * status-code shapes and message text since adapters throw plain Errors.
 */
export function isTransientError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;

  const anyErr = err as {
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
    response?: { status?: unknown };
    message?: unknown;
  };

  const status =
    typeof anyErr.status === "number"
      ? anyErr.status
      : typeof anyErr.statusCode === "number"
        ? anyErr.statusCode
        : typeof anyErr.response?.status === "number"
          ? anyErr.response.status
          : undefined;

  if (status !== undefined && (status === 429 || status >= 500)) return true;

  const code = typeof anyErr.code === "string" ? anyErr.code : "";
  if (["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN"].includes(code)) {
    return true;
  }

  const message = typeof anyErr.message === "string" ? anyErr.message.toLowerCase() : "";
  return (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("temporarily unavailable")
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 8000;
  const isRetryable = opts.isRetryable ?? isTransientError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Out of attempts or not worth retrying — give up.
      if (attempt === retries || !isRetryable(err)) {
        throw err;
      }

      const exp = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelayMs;
      const delayMs = Math.min(maxDelayMs, exp + jitter);

      opts.onRetry?.(err, attempt + 1, delayMs);
      await sleep(delayMs);
    }
  }

  // Unreachable, but satisfies the type checker.
  throw lastError;
}
