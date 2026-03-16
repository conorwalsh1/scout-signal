const DEFAULT_ATTEMPTS = 3;
const DEFAULT_DELAY_MS = 1000;

/**
 * Retry an async function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delayMs?: number } = {}
): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        const wait = delayMs * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}
