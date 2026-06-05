import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp (seconds)
  retryAfter: number; // Seconds until reset
}

/**
 * Token bucket rate limiter backed by Redis + Lua script.
 * The Lua script runs atomically on the Redis server.
 */
@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly redis: Redis;

  /**
   * Lua script: atomic token bucket.
   * KEYS[1] = bucket key
   * ARGV[1] = max tokens (limit)
   * ARGV[2] = window in seconds
   * ARGV[3] = current timestamp (seconds)
   *
   * Returns: [allowed (0|1), remaining, resetAt]
   */
  private readonly luaScript = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    local bucket = redis.call('HMGET', key, 'tokens', 'reset_at')
    local tokens = tonumber(bucket[1])
    local reset_at = tonumber(bucket[2])

    if tokens == nil or now >= reset_at then
      tokens = limit
      reset_at = now + window
      redis.call('HMSET', key, 'tokens', tokens, 'reset_at', reset_at)
      redis.call('EXPIREAT', key, reset_at + 1)
    end

    if tokens > 0 then
      tokens = tokens - 1
      redis.call('HSET', key, 'tokens', tokens)
      return {1, tokens, reset_at}
    else
      return {0, 0, reset_at}
    end
  `;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      // Managed Redis (Upstash) requires auth + TLS — without these every
      // command failed and retried, adding seconds of latency to EVERY request
      // (including /health, which then timed out Render's health check).
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined,
      maxRetriesPerRequest: 1,
      // Fail fast when Redis is unreachable so checkLimit() can fail open
      // immediately instead of queueing commands.
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    this.redis.connect().catch(() => {
      // Silently fail — guard will allow requests if Redis is down
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async checkLimit(
    key: string,
    limit: number,
    windowSec: number,
  ): Promise<RateLimitResult> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const result = (await this.redis.eval(
        this.luaScript,
        1,
        key,
        limit,
        windowSec,
        now,
      )) as [number, number, number];

      const [allowed, remaining, resetAt] = result;
      return {
        allowed: allowed === 1,
        limit,
        remaining,
        resetAt,
        retryAfter: Math.max(0, resetAt - now),
      };
    } catch {
      // If Redis is unavailable, allow the request (fail open)
      return {
        allowed: true,
        limit,
        remaining: limit,
        resetAt: Math.floor(Date.now() / 1000) + windowSec,
        retryAfter: 0,
      };
    }
  }
}
