export class NetworkTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkTimeoutError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 12000,
  message = 'Request timeout'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new NetworkTimeoutError(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new NetworkTimeoutError('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
