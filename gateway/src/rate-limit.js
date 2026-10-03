// Fixed-window counters. With REDIS_URL the window is shared by all gateway
// replicas; without it each replica counts on its own (fine for one replica or dev).
// If Redis is unreachable the gateway fails open: the database still enforces its
// own per-account limits, and availability of time clocks matters more.

export function createMemoryStore() {
  const windows = new Map();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) if (entry.resetAt <= now) windows.delete(key);
  }, 30_000);
  sweep.unref();
  return {
    async increment(key, windowMs) {
      const now = Date.now();
      let entry = windows.get(key);
      if (!entry || entry.resetAt <= now) { entry = { count: 0, resetAt: now + windowMs }; windows.set(key, entry); }
      entry.count++;
      return { count: entry.count, resetMs: entry.resetAt - now };
    },
    async close() { clearInterval(sweep); },
  };
}

export async function createRedisStore(url, prefix) {
  const { default: Redis } = await import('ioredis');
  const redis = new Redis(url, { enableOfflineQueue: false, maxRetriesPerRequest: 1, connectTimeout: 2000, commandTimeout: 500, lazyConnect: false });
  redis.on('error', () => {});
  return {
    async increment(key, windowMs) {
      const results = await redis.multi().set(prefix + key, 0, 'PX', windowMs, 'NX').incr(prefix + key).pttl(prefix + key).exec();
      return { count: Number(results[1][1]), resetMs: Math.max(0, Number(results[2][1])) };
    },
    async close() { redis.disconnect(); },
  };
}

export function createRateLimiter(store, windowSeconds, log = () => {}) {
  const windowMs = windowSeconds * 1000;
  return {
    async hit(key, limit) {
      if (!limit) return { allowed: true, retryAfter: 0 };
      try {
        const { count, resetMs } = await store.increment(key, windowMs);
        return { allowed: count <= limit, retryAfter: Math.max(1, Math.ceil(resetMs / 1000)) };
      } catch (error) {
        log('warn', 'rate limit store unavailable, allowing request', { error: error.message });
        return { allowed: true, retryAfter: 0 };
      }
    },
    close: () => store.close(),
  };
}
