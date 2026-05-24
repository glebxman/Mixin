import Fastify from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import { authPlugin } from "./plugins/auth.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { redisPlugin } from "./plugins/redis.js";
import { parseCorsOrigins } from "./config.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { authMeRoute } from "./modules/auth/auth.me.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { studentsRoutes } from "./modules/students/students.routes.js";
import { questsRoutes } from "./modules/quests/quests.routes.js";
import { progressRoutes } from "./modules/progress/progress.routes.js";
import { subscriptionsRoutes } from "./modules/subscriptions/subscriptions.routes.js";
import { notificationsRoutes } from "./modules/notifications/notifications.routes.js";
import { parentRoutes } from "./modules/parent/parent.routes.js";

import { adminRoutes } from "./modules/admin/admin.routes.js";
import { aiRoutes } from "./modules/ai/ai.routes.js";
import { aiImageRoutes } from "./modules/ai/ai.images.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      // Никогда не логируем тело запроса/ответа целиком (там пароли и токены).
      // Только метаданные.
      serializers: {
        req(req) {
          return { method: req.method, url: req.url, ip: req.ip };
        },
      },
    },
    bodyLimit: 1024 * 1024, // 1 MB — защита от DoS большими payload
    trustProxy: process.env.NODE_ENV === "production",
  });

  await app.register(sensible);

  // Security headers — CSP, HSTS, X-Frame-Options и др.
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  // CORS: explicit allowlist only. Never `origin: true`, never `"*"`.
  // The deeper validation (reject `*`, require non-empty in prod) lives in
  // ``parseCorsOrigins`` from ``./config.ts``. In dev with no ``CORS_ORIGINS``
  // we substitute the documented localhost set used by the four Frontend_Apps.
  const isProd = process.env.NODE_ENV === "production";
  const configuredOrigins = parseCorsOrigins(process.env.CORS_ORIGINS, isProd);
  const devFallback = [
    process.env.VITE_STUDENT_URL || "http://localhost:3100",
    process.env.VITE_PARENT_URL || "http://localhost:3200",
    process.env.VITE_ADMIN_URL || "http://localhost:3400",
  ];
  const allowList = configuredOrigins.length > 0 ? configuredOrigins : devFallback;
  app.log.info({ origins: allowList, source: configuredOrigins.length > 0 ? "CORS_ORIGINS" : "dev-fallback" }, "CORS allowlist registered");
  await app.register(cors, {
    origin: allowList,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // Разрешаем CSRF-заголовок
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  });

  // Глобальный rate-limit (per-user если авторизован, per-ip иначе).
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (request) => {
      const auth = (request as { authUser?: { userId: string } }).authUser;
      return auth?.userId || request.ip;
    },
  });

  await app.register(swagger, {
    openapi: {
      info: { title: "Mixin EdTech UZ API", version: "1.0.0" },
    },
  });

  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(authMeRoute, { prefix: "/api/auth" });
  await app.register(usersRoutes, { prefix: "/api/users" });
  await app.register(studentsRoutes, { prefix: "/api/students" });
  await app.register(parentRoutes, { prefix: "/api/parent" });

  await app.register(adminRoutes, { prefix: "/api/admin" });
  await app.register(questsRoutes, { prefix: "/api/quests" });
  await app.register(progressRoutes, { prefix: "/api/progress" });
  await app.register(subscriptionsRoutes, { prefix: "/api/subscriptions" });
  await app.register(notificationsRoutes, { prefix: "/api/notifications" });
  await app.register(aiRoutes, { prefix: "/api/ai" });
  await app.register(aiImageRoutes, { prefix: "/api/ai" });

  app.get("/health", async () => ({ status: "ok" }));

  app.setErrorHandler((error: import("fastify").FastifyError, request, reply) => {
    request.log.error({ err: { message: error.message, code: error.code } }, "request failed");
    const status = error.statusCode ?? 500;
    if (status < 500) {
      return reply.status(status).send({
        success: false,
        error: error.message,
      });
    }
    // 5xx: НЕ протекаем детали наружу.
    return reply.status(500).send({
      success: false,
      error: "Internal server error",
    });
  });

  return app;
}
