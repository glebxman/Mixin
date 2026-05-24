/**
 * Google OAuth flow: /google → редирект на Google, /google/callback,
 * /google/complete (досье регистрации после Google login).
 */
import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { registerSchema, type RegisterInput } from "@edtech/types";
import { COOKIE_PREFIX } from "@edtech/config";
import { completeGoogleRegistration, isRegistrationComplete } from "./auth.service.js";
import {
  AUTH_RATE_LIMIT,
  issueSession,
} from "./auth.cookies.js";
import { clearSessionCookie, safeCompareStrings, setSessionCookie } from "../../plugins/auth.js";

const GOOGLE_STATE_COOKIE = `${COOKIE_PREFIX}mixin_google_oauth_state`;
const GOOGLE_RETURN_COOKIE = `${COOKIE_PREFIX}mixin_google_oauth_return`;
const GOOGLE_SIGNUP_COOKIE = `${COOKIE_PREFIX}mixin_google_signup`;

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

type GoogleSignupToken = {
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
};

function safeReturnPath(input: unknown, fallback = "/") {
  if (typeof input !== "string") return fallback;
  if (!input.startsWith("/") || input.startsWith("//") || input.startsWith("/\\")) {
    return fallback;
  }
  return input;
}

function getStudentUrl() {
  return process.env.VITE_STUDENT_URL || "http://localhost:3100";
}

function getRoleUrl(role: string, path: string) {
  const base =
    role === "PARENT"
      ? process.env.VITE_PARENT_URL || "http://localhost:3200"
      : role === "SUPER_ADMIN"
        ? process.env.VITE_ADMIN_URL || "http://localhost:3400"
        : getStudentUrl();
  return new URL(role === "STUDENT" ? path : "/", base).toString();
}

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const publicApiUrl =
    process.env.API_PUBLIC_URL ||
    process.env.VITE_API_URL ||
    `http://localhost:${process.env.API_PORT || 3001}`;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    new URL("/api/auth/google/callback", publicApiUrl).toString();

  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

async function findGoogleUser(app: FastifyInstance, profile: GoogleUserInfo) {
  const email = profile.email?.toLowerCase().trim();
  if (!email || !profile.email_verified) {
    throw new Error("Google account email is not verified");
  }

  const include = {
    profile: true,
    studentProfile: true,
    parentProfile: true,
  } as const;

  const existing = await app.prisma.user.findUnique({
    where: { email },
    include,
  });

  if (existing) {
    if (!isRegistrationComplete(existing)) {
      return null;
    }

    if (profile.picture && existing.profile && !existing.profile.avatarUrl) {
      await app.prisma.profile.update({
        where: { userId: existing.id },
        data: { avatarUrl: profile.picture },
      });
    }

    const { passwordHash: _omit, ...safeUser } = await app.prisma.user.findUniqueOrThrow({
      where: { id: existing.id },
      include,
    });
    return safeUser;
  }

  return null;
}

export async function googleAuthRoutes(app: FastifyInstance) {
  app.get("/google", AUTH_RATE_LIMIT, async (request, reply) => {
    const config = getGoogleConfig();
    if (!config) {
      return reply.status(501).send({
        success: false,
        error: "Google OAuth is not configured",
      });
    }

    const query = request.query as { from?: string; mode?: string };
    const state = randomBytes(32).toString("hex");
    const returnPath = safeReturnPath(
      query.mode === "register" ? "/profile" : query.from,
      "/",
    );

    setSessionCookie(reply, GOOGLE_STATE_COOKIE, state, {
      maxAge: 60 * 10,
      httpOnly: true,
      path: "/",
    });
    setSessionCookie(reply, GOOGLE_RETURN_COOKIE, returnPath, {
      maxAge: 60 * 10,
      httpOnly: true,
      path: "/",
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });

    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get("/google/callback", AUTH_RATE_LIMIT, async (request, reply) => {
    const config = getGoogleConfig();
    if (!config) {
      return reply.status(501).send({
        success: false,
        error: "Google OAuth is not configured",
      });
    }

    const query = request.query as { code?: string; state?: string; error?: string };
    const returnPath = safeReturnPath(request.cookies[GOOGLE_RETURN_COOKIE], "/");
    const redirectToLogin = (reason: string) => {
      const url = new URL("/login", getStudentUrl());
      url.searchParams.set("error", reason);
      return reply.redirect(url.toString());
    };

    clearSessionCookie(reply, GOOGLE_STATE_COOKIE);
    clearSessionCookie(reply, GOOGLE_RETURN_COOKIE);

    if (query.error) {
      return redirectToLogin("google_cancelled");
    }

    const cookieState = request.cookies[GOOGLE_STATE_COOKIE];
    if (
      !query.code ||
      !query.state ||
      !cookieState ||
      !safeCompareStrings(query.state, cookieState)
    ) {
      return redirectToLogin("google_state_invalid");
    }

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: query.code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse;
      if (!tokenResponse.ok || !tokenJson.access_token) {
        app.log.warn(
          { status: tokenResponse.status, error: tokenJson.error },
          "google token exchange failed",
        );
        return redirectToLogin("google_token_failed");
      }

      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      const profile = (await profileResponse.json()) as GoogleUserInfo;
      if (!profileResponse.ok) {
        app.log.warn({ status: profileResponse.status }, "google profile fetch failed");
        return redirectToLogin("google_profile_failed");
      }

      const existingUser = await findGoogleUser(app, profile);
      if (!existingUser) {
        const email = profile.email?.toLowerCase().trim();
        if (!email || !profile.email_verified) {
          return redirectToLogin("google_email_not_verified");
        }

        const firstName = profile.given_name || profile.name?.split(" ")[0] || "";
        const lastName =
          profile.family_name || profile.name?.split(" ").slice(1).join(" ") || "";
        const signupToken = app.jwt.sign(
          {
            email,
            firstName: firstName.slice(0, 64),
            lastName: lastName.slice(0, 64),
            picture: profile.picture,
          } satisfies GoogleSignupToken,
          { expiresIn: "10m" },
        );

        setSessionCookie(reply, GOOGLE_SIGNUP_COOKIE, signupToken, {
          maxAge: 60 * 10,
          httpOnly: true,
          path: "/",
        });

        const registerUrl = new URL("/register", getStudentUrl());
        registerUrl.searchParams.set("google", "1");
        registerUrl.searchParams.set("email", email);
        if (firstName) registerUrl.searchParams.set("firstName", firstName);
        if (lastName) registerUrl.searchParams.set("lastName", lastName);
        return reply.redirect(registerUrl.toString());
      }

      const user = existingUser;
      await issueSession(app, request, reply, user);
      return reply.redirect(getRoleUrl(user.role, returnPath));
    } catch (err) {
      app.log.warn(
        { message: err instanceof Error ? err.message : "unknown" },
        "google oauth failed",
      );
      return redirectToLogin("google_failed");
    }
  });

  app.post("/google/complete", AUTH_RATE_LIMIT, async (request, reply) => {
    const token = request.cookies[GOOGLE_SIGNUP_COOKIE];
    if (!token) {
      return reply.status(401).send({
        success: false,
        error: "Google signup session expired",
      });
    }

    let googleData: GoogleSignupToken;
    try {
      googleData = app.jwt.verify<GoogleSignupToken>(token);
    } catch {
      clearSessionCookie(reply, GOOGLE_SIGNUP_COOKIE);
      return reply.status(401).send({
        success: false,
        error: "Google signup session expired",
      });
    }

    let data: RegisterInput;
    try {
      data = registerSchema.parse({
        ...(request.body as Record<string, unknown>),
        email: googleData.email,
      });
    } catch (err) {
      const message =
        err instanceof ZodError ? err.errors[0]?.message : "Invalid payload";
      return reply.status(400).send({ success: false, error: message });
    }

    try {
      const user = await completeGoogleRegistration(app.prisma, data);
      if (googleData.picture && user.profile) {
        await app.prisma.profile.update({
          where: { userId: user.id },
          data: { avatarUrl: googleData.picture },
        });
      }

      await issueSession(app, request, reply, user);
      clearSessionCookie(reply, GOOGLE_SIGNUP_COOKIE);

      return reply.status(201).send({ success: true, data: { user } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      app.log.warn(
        { message, stack: err instanceof Error ? err.stack : undefined },
        "google signup completion failed",
      );
      const isConflict = message.toLowerCase().includes("already");
      const status = isConflict ? 409 : 400;
      return reply.status(status).send({ success: false, error: message });
    }
  });
}
