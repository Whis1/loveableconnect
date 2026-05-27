export class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export const withTimeout = async <T>(
  promise: PromiseLike<T>,
  timeoutMs = 6000,
  message = "Operation timed out"
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new TimeoutError(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const withFallback = async <T>(
  promise: PromiseLike<T>,
  fallback: T,
  timeoutMs = 6000
): Promise<T> => {
  try {
    return await withTimeout(promise, timeoutMs);
  } catch {
    return fallback;
  }
};
