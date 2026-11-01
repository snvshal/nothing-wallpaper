const NETWORK_ERROR_PATTERN =
  /error sending request|client error|dns|timed out|timeout|connect|network|unreachable|offline/i;

export function isOffline(): boolean {
  try {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  } catch {
    return false;
  }
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof Error) return NETWORK_ERROR_PATTERN.test(err.message);
  if (typeof err === "string") return NETWORK_ERROR_PATTERN.test(err);
  const message = (err as { message?: string })?.message;
  return typeof message === "string" && NETWORK_ERROR_PATTERN.test(message);
}

export function toErrorMessage(err: unknown, fallback = "Check failed"): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  const message = (err as { message?: string })?.message;
  return typeof message === "string" && message ? message : fallback;
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
