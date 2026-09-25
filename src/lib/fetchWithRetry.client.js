const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 400;

function isRetryableStatus(status) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch with capped retries (429/5xx only). Never retries more than maxRetries times.
 */
export async function fetchWithRetry(url, options = {}, { maxRetries = DEFAULT_MAX_RETRIES, retryDelayMs = DEFAULT_RETRY_DELAY_MS } = {}) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, options);
      if (!isRetryableStatus(res.status) || attempt >= maxRetries) {
        return res;
      }
      const retryAfter = Number(res.headers.get("Retry-After"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : retryDelayMs * (attempt + 1);
      await sleep(Math.min(waitMs, 8000));
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries) throw err;
      await sleep(retryDelayMs * (attempt + 1));
    }
    attempt += 1;
  }

  if (lastError) throw lastError;
  return fetch(url, options);
}
