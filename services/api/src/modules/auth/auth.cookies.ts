/**
 * Хелперы для cookie-сессии: единые TTL и setAuthCookies.
 * Используются и в auth.routes, и в auth.google.
 */
import type { FastifyReply } from "fastify";
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
