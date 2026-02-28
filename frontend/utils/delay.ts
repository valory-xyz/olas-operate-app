export const delayInSeconds = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/**
 * Maximum allowed drift (in ms) between expected and actual elapsed time.
 * If the actual elapsed time exceeds `expected + threshold`, the device
 * likely went to sleep during the delay. Callers should treat a `false`
 * return as "system woke from sleep — bail out and let the loop restart
 * with fresh state."
 */
const SLEEP_DRIFT_THRESHOLD_MS = 30_000;

/**
 * Like `delayInSeconds` but detects whether the device went to sleep
 * during the wait. Returns `true` if the delay completed normally,
 * `false` if the elapsed wall-clock time indicates a sleep/wake event.
 */
export const sleepAwareDelay = async (seconds: number): Promise<boolean> => {
  const before = Date.now();
  await delayInSeconds(seconds);
  const elapsed = Date.now() - before;
  return elapsed < seconds * 1000 + SLEEP_DRIFT_THRESHOLD_MS;
};

/**
 * Resolves/rejects with `operation`, unless `timeoutMs` elapses first.
 * Note: this does not cancel the underlying operation.
 */
export const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
  createTimeoutError: () => Error,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(createTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
