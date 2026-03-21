type RateLimitConfig = {
  interval: number; // ms
  maxRequests: number;
};

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 60_000);
}

export function rateLimit(config: RateLimitConfig) {
  return {
    check(key: string): { success: boolean; remaining: number; resetIn: number } {
      const now = Date.now();
      const entry = rateLimitMap.get(key);

      if (!entry || now > entry.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + config.interval });
        return { success: true, remaining: config.maxRequests - 1, resetIn: config.interval };
      }

      if (entry.count >= config.maxRequests) {
        return { success: false, remaining: 0, resetIn: entry.resetTime - now };
      }

      entry.count++;
      return { success: true, remaining: config.maxRequests - entry.count, resetIn: entry.resetTime - now };
    },
  };
}

// Pre-configured limiters
export const authLimiter = rateLimit({ interval: 15 * 60 * 1000, maxRequests: 10 }); // 10 per 15 min
export const aiLimiter = rateLimit({ interval: 60 * 1000, maxRequests: 5 }); // 5 per minute
export const apiLimiter = rateLimit({ interval: 60 * 1000, maxRequests: 30 }); // 30 per minute
export const transcriptLimiter = rateLimit({ interval: 60 * 60 * 1000, maxRequests: 10 }); // 10 per hour

export function getRateLimitKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `${prefix}:${ip}`;
}

export function rateLimitResponse(resetIn: number) {
  return Response.json(
    { error: 'Too many requests. Please try again later.', retryAfter: Math.ceil(resetIn / 1000) },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(resetIn / 1000)) } }
  );
}
