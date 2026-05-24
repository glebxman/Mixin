import fp from "fastify-plugin";
import Redis from "ioredis";

export const redisPlugin = fp(
  async (app) => {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    const redis = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });

    redis.on("error", (err) => {
      app.log.error({ err }, "redis error");
    });

    app.decorate("redis", redis);

    app.addHook("onClose", async () => {
      redis.disconnect();
    });
  },
  { name: "redis" },
);

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}
