import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@edtech/types";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ROLE_COOKIE,
} from "@edtech/config";
import { loginUser, registerUser } from "./auth.service.js";
import {
  ACCESS_TTL,
  AUTH_RATE_LIMIT,
  REFRESH_MAX_AGE_SECONDS,
  REFRESH_TTL,
  setAuthCookies,
} from "./auth.cookies.js";
import { googleAuthRoutes } from "./auth.google.js";
import { clearSessionCookie } from "../../plugins/auth.js";

export async function authRoutes(app: FastifyInstance) {
  await googleAuthRoutes(app);

  app.post("/register", AUTH_RATE_LIMIT, async (request, reply) => {
    let data: RegisterInput;
    try {
      data = registerSchema.parse(request.body);
    } catch (err) {
      const message =
        err instanceof ZodError ? err.errors[0]?.message : "Invalid payload";
      return reply.status(400).send({ success: false, error: message });
    }

    try {
      const user = await registerUser(app.prisma, data);
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

      return reply.status(201).send({ success: true, data: { user } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      // SECURITY: логируем только message, не весь err — стек содержит пути.
      app.log.warn({ message }, "register failed");
      const status = message.toLowerCase().includes("already") ? 409 : 400;
      return reply.status(status).send({ success: false, error: message });
    }
  });

  app.post("/login", AUTH_RATE_LIMIT, async (request, reply) => {
    let data: LoginInput;
    try {
      data = loginSchema.parse(request.body);
    } catch {
      return reply
        .status(400)
        .send({ success: false, error: "Invalid credentials" });
    }

    try {
      const user = await loginUser(app.prisma, data);
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

      return reply.status(200).send({ success: true, data: { user } });
    } catch (err) {
      app.log.warn(
        { message: err instanceof Error ? err.message : "unknown" },
        "login failed",
      );
      return reply
        .status(401)
        .send({ success: false, error: "Invalid credentials" });
    }
  });

  app.post("/logout", async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE];
    if (refreshToken) {
      try {
        await app.prisma.session.delete({
          where: { refreshToken },
        });
      } catch {
        // Ignore if session not found in DB
      }
    }
    clearSessionCookie(reply, ACCESS_TOKEN_COOKIE);
    clearSessionCookie(reply, REFRESH_TOKEN_COOKIE);
    clearSessionCookie(reply, ROLE_COOKIE);
    return reply.status(200).send({ success: true });
  });

  app.post("/refresh", async (request, reply) => {
    const oldRefreshToken = request.cookies[REFRESH_TOKEN_COOKIE];
    if (!oldRefreshToken) {
      return reply.status(401).send({ success: false, error: "No refresh token" });
    }

    let decoded: { userId: string };
    try {
      decoded = app.jwt.verify<{ userId: string }>(oldRefreshToken);
    } catch {
      return reply
        .status(401)
        .send({ success: false, error: "Invalid refresh token" });
    }
    void decoded;

    const session = await app.prisma.session.findUnique({
      where: { refreshToken: oldRefreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        try {
          await app.prisma.session.delete({ where: { id: session.id } });
        } catch {}
      }
      return reply
        .status(401)
        .send({ success: false, error: "Session expired or invalid" });
    }

    // Token rotation:
    const accessToken = app.jwt.sign(
      { userId: session.userId, role: session.user.role },
      { expiresIn: ACCESS_TTL },
    );
    const newRefreshToken = app.jwt.sign(
      { userId: session.userId },
      { expiresIn: REFRESH_TTL },
    );

    try {
      await app.prisma.$transaction([
        app.prisma.session.delete({
          where: { id: session.id },
        }),
        app.prisma.session.create({
          data: {
            userId: session.userId,
            refreshToken: newRefreshToken,
            ip: request.ip,
            userAgent: request.headers["user-agent"] || null,
            expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_SECONDS * 1000),
          },
        }),
      ]);
    } catch {
      return reply
        .status(500)
        .send({ success: false, error: "Failed to rotate session" });
    }

    setAuthCookies(reply, accessToken, newRefreshToken, session.user.role);
    return reply.status(200).send({ success: true });
  });
}
