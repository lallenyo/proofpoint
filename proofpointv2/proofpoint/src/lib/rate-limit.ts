// ═══════════════════════════════════════════════════════════════════════════
// Reusable In-Memory Rate Limiter
// ═══════════════════════════════════════════════════════════════════════════

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Creates a rate limiter for a specific route/purpose.
 *
 * @param name - Unique name for this rate limiter (e.g., "api-accounts")
 * @param limit - Max requests per window
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 */
export function createRateLimiter(
  name: string,
  limit: number,
  windowMs: number = 60 * 60 * 1000
) {
  // Get or create the store for this limiter
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now >= entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
      }

      if (entry.count >= limit) {
        return { allowed: false, remaining: 0, resetInMs: entry.resetAt - now };
      }

      entry.count++;
      return {
        allowed: true,
        remaining: limit - entry.count,
        resetInMs: entry.resetAt - now,
      };
    },

    headers(result: RateLimitResult): Record<string, string> {
      return {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetInMs / 1000)),
      };
    },
  };
}

// ── Pre-configured rate limiters ──────────────────────────────────────

/** /api/anthropic — 50 req/hour per user */
export const anthropicLimiter = createRateLimiter("anthropic", 50);

/** /api/hubspot/* — 30 req/hour per user */
export const hubspotLimiter = createRateLimiter("hubspot", 30);

/** /api/accounts/* — 100 req/hour per user */
export const accountsLimiter = createRateLimiter("accounts", 100);

/** /api/reports/* — 100 req/hour per user */
export const reportsLimiter = createRateLimiter("reports", 100);

/** /api/tasks/* — 200 req/hour per user */
export const tasksLimiter = createRateLimiter("tasks", 200);

/** /api/alerts/* — 100 req/hour per user */
export const alertsLimiter = createRateLimiter("alerts", 100);

/** /api/emails/* — 50 req/hour per user */
export const emailsLimiter = createRateLimiter("emails", 50);

/** /api/playbooks/* — 50 req/hour per user */
export const playbooksLimiter = createRateLimiter("playbooks", 50);

/** /api/analytics — 60 req/hour per user */
export const analyticsLimiter = createRateLimiter("analytics", 60);

// ── Periodic cleanup (every 10 minutes) ──────────────────────────────
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    stores.forEach((store) => {
      store.forEach((entry, key) => {
        if (now >= entry.resetAt) store.delete(key);
      });
    });
  };
  setInterval(cleanup, 10 * 60 * 1000).unref?.();
}
