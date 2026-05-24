import type { FastifyInstance } from "fastify";

/**
 * Atomic per-user daily counter in Redis with auto-expiry.
 *
 * Used by AI endpoints (chat, image generation) to enforce subscription-tier
 * caps. The Lua script lives here as a single source of truth — duplicating
 * it across modules historically caused subtle drift in expiry handling.
 *
 * Behaviour:
 *   - INCR an "<prefix>:<userId>:<YYYY-MM-DD>" key.
 *   - If the new value > limit, return { allowed: false } without incrementing.
 *   - Otherwise INCR and set TTL of 26h on first hit (covers DST shifts).
 *   - When `AI_RATE_LIMIT_DISABLED=true`, always allow. In production this
 *     emits a warning so the override doesn't slip past code review.
 *   - When `limit < 0`, the limit is treated as "unlimited" and bypasses Redis.
 */

const COUNTER_LUA = `
  local current = tonumber(redis.call('get', KEYS[1]) or '0')
  local limit = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])
  if current >= limit then return { 0, current } end
  local next = redis.call('incr', KEYS[1])
  if next == 1 then redis.call('expire', KEYS[1], ttl) end
  return { 1, next }
`;

const TTL_SECONDS = 60 * 60 * 26;

export type DailyCounterArgs = {
  /** Stable prefix that scopes the counter (e.g. "ai:daily:" or "ai:image:daily:"). */
  keyPrefix: string;
  /** User identity that participates in the key. */
  userId: string;
  /** Maximum requests allowed per UTC day. Negative ⇒ unlimited. */
  limit: number;
};

export async function incrementDailyCounter(
  app: FastifyInstance,
  { keyPrefix, userId, limit }: DailyCounterArgs,
): Promise<{ allowed: boolean; used: number }> {
  if (process.env.AI_RATE_LIMIT_DISABLED === "true") {
    if (process.env.NODE_ENV === "production") {
      app.log.warn(
        { userId, keyPrefix },
        "Rate limit bypassed (AI_RATE_LIMIT_DISABLED=true in production)",
      );
    }
    return { allowed: true, used: 0 };
  }
  if (limit < 0) return { allowed: true, used: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const key = `${keyPrefix}${userId}:${today}`;

  const result = (await app.redis.eval(
    COUNTER_LUA,
    1,
    key,
    String(limit),
    String(TTL_SECONDS),
  )) as [number, number];

  return { allowed: result[0] === 1, used: result[1] };
}
