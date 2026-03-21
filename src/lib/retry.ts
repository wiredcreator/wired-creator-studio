export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; retryOn?: number[] } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, retryOn = [429, 503, 502] } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { status?: number; statusCode?: number; code?: string };
      const status = err?.status || err?.statusCode;
      const isRetryable = (status && retryOn.includes(status)) || err?.code === 'ECONNRESET';

      if (attempt === maxRetries || !isRetryable) throw error;

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Retry failed');
}
