import Redis from 'ioredis';

export function createRedisClient(url: string): Redis {
  return new Redis(url, {
    // Fail fast on a bad connection instead of buffering commands
    // indefinitely — callers should see the error, not hang.
    maxRetriesPerRequest: 3,
  });
}
