import { timingSafeEqual } from "node:crypto";
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ACCESS_TOKEN_COOKIE, CSRF_COOKIE } from "@edtech/config";

type AuthUser = { userId: string; role: string };

/**
 * Constant-time сравнение строк — защита от timing attacks при
 * сравнении INTERNAL_SERVICE_TOKEN или других секретов.
 */
export function safeCompareStrings(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Унифицированная установка session/auth cookie.
 *
 * В production:
 *   - secure: true
 *   - sameSite: "lax"
 *   - path: "/"  (по умолчанию; обязателен для __Host- префикса)
 *   - domain: не выставляется (требование __Host-)
 *   - httpOnly: true (по умолчанию)
 *
 * В dev: то же самое, но secure: false (т.к. http://localhost).
 *
 * Имя cookie должно приходить из констант @edtech/config — там префикс
 * "__Host-" уже подставлен в production и пуст в dev.
 */
export function setSessionCookie(
  reply: FastifyReply,
  name: string,
  value: string,
  opts: {
    maxAge: number;
    httpOnly?: boolean;
    path?: string;
  },
): void {
  const isProd = process.env.NODE_ENV === "production";
  reply.setCookie(name, value, {
    path: opts.path ?? "/",
    httpOnly: opts.httpOnly ?? true,
    secure: isProd,
    sameSite: "lax",
    maxAge: opts.maxAge,
  });
}

/**
 * Унифицированная очистка session/auth cookie. Браузер не валидирует
 * __Host- префикс на удалении, достаточно совпадения name + path.
 */
export function clearSessionCookie(
  reply: FastifyReply,
  name: string,
  opts?: { path?: string },
): void {
  reply.clearCookie(name, { path: opts?.path ?? "/" });
}

/**
 * Двойной submit cookie pattern: для не-GET запросов фронт кладёт
 * значение из cookie также в заголовок X-CSRF-Token. Атакующий с другого
 * домена не может прочитать cookie → не сможет прислать заголовок.
 *
 * cookie ROLE_COOKIE подходит — он читаемый, привязан к сессии и
 * меняется при login/logout.
 */
const CSRF_HEADER = "x-csrf-token";

export const authPlugin = fp(
  async (app) => {
    const accessSecret = process.env.JWT_ACCESS_SECRET;

    if (!accessSecret) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "JWT_ACCESS_SECRET is required in production. Generate via `node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"`",
        );
      }
      app.log.warn(
        "JWT_ACCESS_SECRET is not set; using a dev-only fallback. Do NOT deploy this.",
      );
    }

    if (accessSecret && accessSecret.length < 32 && process.env.NODE_ENV === "production") {
      throw new Error("JWT_ACCESS_SECRET must be at least 32 chars in production.");
    }

    await app.register(jwt, {
      secret: accessSecret || "dev-only-do-not-use-in-production",
      sign: { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" },
    });

    await app.register(cookie);

    app.decorate(
      "authenticate",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          // Канонический cookie — ACCESS_TOKEN_COOKIE.
          const cookieToken =
            request.cookies[ACCESS_TOKEN_COOKIE] ||
            request.cookies.accessToken;
          // Bearer-токен поддерживаем только для внутренних/CLI вызовов:
          // браузер должен использовать cookie + CSRF.
          const headerToken = request.headers.authorization?.replace(
            /^Bearer\s+/i,
            "",
          );
          const token = cookieToken || headerToken;

          if (!token) {
            return reply.status(401).send({ success: false, error: "Unauthorized" });
          }

          request.authUser = app.jwt.verify<AuthUser>(token);
        } catch {
          return reply.status(401).send({ success: false, error: "Invalid token" });
        }
      },
    );

    app.decorate(
      "requireRole",
      (...roles: string[]) =>
        async (request: FastifyRequest, reply: FastifyReply) => {
          if (!request.authUser) {
            return reply
              .status(401)
              .send({ success: false, error: "Unauthorized" });
          }
          if (!roles.includes(request.authUser.role)) {
            return reply
              .status(403)
              .send({ success: false, error: "Forbidden" });
          }
        },
    );

    /**
     * onRequest hook — глобальная CSRF защита для cookie-based auth.
     *
     * Срабатывает на mutating-запросах (POST/PUT/PATCH/DELETE).
     * Пропускается:
     * - GET/HEAD/OPTIONS (по определению safe)
     * - запросы с Authorization: Bearer (server-to-server)
     * - /api/auth/login и /api/auth/register (нет cookie до этого момента)
     * - запросы без access-cookie вообще (анонимы — отвергнутся auth-плагином)
     */
    app.addHook("onRequest", async (request, reply) => {
      const method = request.method.toUpperCase();
      if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

      const url = request.url.split("?")[0];
      // Public endpoints без cookie на момент запроса
      if (
        url === "/api/auth/login" ||
        url === "/api/auth/register" ||
        url === "/api/auth/google/complete" ||
        url === "/api/auth/logout" ||
        url === "/api/auth/csrf"
      ) {
        return;
      }

      // Bearer вместо cookie → server-to-server, CSRF не применим.
      if (request.headers.authorization?.startsWith("Bearer ")) return;

      const cookieToken = request.cookies[CSRF_COOKIE];
      const headerToken = request.headers[CSRF_HEADER];

      if (!cookieToken) {
        return reply
          .status(403)
          .send({ success: false, error: "CSRF token missing" });
      }
      if (typeof headerToken !== "string" || !safeCompareStrings(cookieToken, headerToken)) {
        return reply
          .status(403)
          .send({ success: false, error: "CSRF token invalid" });
      }
    });

    /**
     * GET /api/auth/csrf — отдаёт значение CSRF-токена в cookie и
     * в JSON ответе. Фронт читает значение и добавляет в заголовок
     * X-CSRF-Token при mutating-запросах.
     *
     * Cookie НЕ httpOnly — это намеренно (double-submit pattern).
     * Атакующий с другого домена не сможет прочитать cookie из-за SameOrigin.
     */
    app.get("/api/auth/csrf", async (request, reply) => {
      let token = request.cookies[CSRF_COOKIE];
      if (!token) {
        const { randomBytes } = await import("node:crypto");
        token = randomBytes(32).toString("hex");
        setSessionCookie(reply, CSRF_COOKIE, token, {
          maxAge: 60 * 60 * 24,
          httpOnly: false,
          path: "/",
        });
      }
      return { success: true, data: { csrfToken: token } };
    });
  },
  { name: "auth", dependencies: [] },
);

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireRole: (
      ...roles: string[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}
