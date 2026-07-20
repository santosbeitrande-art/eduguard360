type CacheValue = { value: any; expiresAt: number };

const memoryCache = new Map<string, CacheValue>();
let redisClientPromise: Promise<any | null> | null = null;

async function getRedisClient() {
  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) return null;
  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createClient } = require('redis');
        const client = createClient({ url });
        client.on('error', () => undefined);
        await client.connect();
        return client;
      } catch {
        return null;
      }
    })();
  }
  return redisClientPromise;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }

  const row = memoryCache.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return row.value as T;
}

export async function cacheSet(key: string, value: any, ttlSeconds = 3600) {
  const redis = await getRedisClient();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return;
    } catch {
      // fall through to memory cache
    }
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + (ttlSeconds * 1000)
  });
}