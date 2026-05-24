/**
 * Хелперы для cookie-сессии: единые TTL и setAuthCookies.
 * Используются и в auth.routes, и в auth.google.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ROLE_COOKIE,
} from "@edtech/config";
import { setSessionCookie } from "../../plugins/auth.js";

export const ACCESS_TTL = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
export const REFRESH_TTL = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
export const ACCESS_MAX_AGE_SECONDS = 60 * 15;
export const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
  role: string,
) {
  setSessionCookie(reply, ACCESS_TOKEN_COOKIE, accessToken, {
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
  setSessionCookie(reply, REFRESH_TOKEN_COOKIE, refreshToken, {
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
  setSessionCookie(reply, ROLE_COOKIE, role, {
    maxAge: REFRESH_MAX_AGE_SECONDS,
    httpOnly: false,
  });
}

export const AUTH_RATE_LIMIT = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: "1 minute",
      keyGenerator: (request: import("fastify").FastifyRequest) =>
        `auth:${request.ip}`,
    },
  },
};

/**
 * Issues an access + refresh JWT for `user`, persists the refresh token as
 * a Session row, and writes the auth cookies. Replaces a 20-line block
 * that was duplicated five times across register / login / refresh /
 * Google callback / Google complete.
 *
 * Returns the generated tokens for callers that need them (e.g. logging),
 * but most callers can ignore the return value.
 */
export async function issueSession(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  user: { id: string; role: string },
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = app.jwt.sign(
    { userId: user.id, role: user.role },
    { expiresIn: ACCESS_TTL },
  );
  const refreshToken = app.jwt.sign(
    { userId: user.id },
    { expiresIn: REFRESH_TTL },
  );

  await app.prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      ip: request.ip,
      userAgent: request.headers["user-agent"] || null,
      expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_SECONDS * 1000),
    },
  });

  setAuthCookies(reply, accessToken, refreshToken, user.role);

  return { accessToken, refreshToken };
}
