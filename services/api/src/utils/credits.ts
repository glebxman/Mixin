import type { FastifyInstance } from "fastify";

const AI_CREDITS_PREFIX = "ai:credits:";
const CREDITS_TTL = 60 * 60 * 26;

/**
 * Atomically consume daily credits via Redis Lua script.
 * Shared by both chat and image-generation endpoints.
 */
export async function consumeDailyCredits(
  app: FastifyInstance,
  userId: string,
  dailyCredits: number,
  cost: number,
): Promise<{ allowed: boolean; remaining: number }> {
  if (process.env.AI_RATE_LIMIT_DISABLED === "true") {
    return { allowed: true, remaining: dailyCredits };
  }
  if (dailyCredits < 0) return { allowed: true, remaining: -1 };

  const today = new Date().toISOString().slice(0, 10);
  const key = `${AI_CREDITS_PREFIX}${userId}:${today}`;

  const luaScript = `
    local remaining = redis.call('get', KEYS[1])
    local daily = tonumber(ARGV[1])
    local cost = tonumber(ARGV[2])
    local ttl = tonumber(ARGV[3])
    if not remaining then
      remaining = daily
      redis.call('set', KEYS[1], remaining, 'EX', ttl)
    else
      remaining = tonumber(remaining)
    end
    if remaining < cost then return { 0, remaining } end
    remaining = remaining - cost
    redis.call('set', KEYS[1], remaining, 'EX', ttl)
    return { 1, remaining }
  `;

  const result = (await app.redis.eval(
    luaScript,
    1,
    key,
    String(dailyCredits),
    String(cost),
    String(CREDITS_TTL),
  )) as [number, number];

  return { allowed: result[0] === 1, remaining: result[1] };
}
