import { defineMiddleware } from 'astro:middleware';

// Simple in-memory rate limiter: 5 requests per minute per IP for /api/generate-pdf
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60_000; // 1 minute

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;

  if (url.pathname === '/api/generate-pdf') {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.windowStart > WINDOW_MS) {
      // New window
      rateLimitMap.set(ip, { count: 1, windowStart: now });
    } else if (entry.count >= RATE_LIMIT) {
      const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait before generating another PDF.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    } else {
      entry.count += 1;
    }
  }

  return next();
});
