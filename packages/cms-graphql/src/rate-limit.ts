import { LRUCache } from "lru-cache";

/**
 * Very small token-bucket limiter keyed by API-key id. The cache is
 * process-local — good enough for single-server MVPs and a stepping stone
 * to a Redis/Upstash-backed limiter when this runs serverless.
 */
export interface RateLimiterOptions {
  /** Tokens per window. */
  limit: number;
  /** Window size in ms. */
  windowMs: number;
  /** Maximum number of keys tracked simultaneously. */
  maxKeys?: number;
}

interface Bucket {
  tokens: number;
  resetAt: number;
}

export class InMemoryRateLimiter {
  private cache: LRUCache<string, Bucket>;
  private limit: number;
  private windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.cache = new LRUCache<string, Bucket>({
      max: options.maxKeys ?? 10_000,
      ttl: options.windowMs * 2,
    });
  }

  check(key: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const existing = this.cache.get(key);
    if (!existing || existing.resetAt <= now) {
      const bucket: Bucket = {
        tokens: this.limit - 1,
        resetAt: now + this.windowMs,
      };
      this.cache.set(key, bucket);
      return { allowed: true, remaining: bucket.tokens, resetAt: bucket.resetAt };
    }
    if (existing.tokens <= 0) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
      };
    }
    existing.tokens -= 1;
    return {
      allowed: true,
      remaining: existing.tokens,
      resetAt: existing.resetAt,
    };
  }
}
