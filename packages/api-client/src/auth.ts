import type { LoginInput, RegisterInput, Role } from "@edtech/types";
import { call } from "./http";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  subscriptionPlan?: "FREE" | "BASIC" | "PREMIUM";
  profile?: {
    firstName: string;
    lastName: string;
    language: string;
    avatarUrl?: string | null;
  } | null;
  studentProfile?: unknown;
  parentProfile?: unknown;
};

/**
 * SECURITY: API больше не возвращает access/refresh токены в body —
 * они живут только в HttpOnly cookies, недоступны JS.
 */
export type AuthResult = {
  user: AuthUser;
};

export type GoogleCompleteInput = Omit<RegisterInput, "email">;

export const authApi = {
  login: (input: LoginInput) =>
    call<AuthResult>({ method: "POST", url: "/api/auth/login", data: input }),
  register: (input: RegisterInput) =>
    call<AuthResult>({ method: "POST", url: "/api/auth/register", data: input }),
  completeGoogleSignup: (input: GoogleCompleteInput) =>
    call<AuthResult>({ method: "POST", url: "/api/auth/google/complete", data: input }),
  logout: () => call<null>({ method: "POST", url: "/api/auth/logout" }),
  me: () => call<AuthUser>({ method: "GET", url: "/api/auth/me" }),
  updateMe: (input: { firstName?: string; lastName?: string; language?: "ru" | "uz" | "en" }) =>
    call<AuthUser>({ method: "PATCH", url: "/api/auth/me", data: input }),
  deleteMe: () => call<null>({ method: "DELETE", url: "/api/auth/me" }),
};

export type SubscriptionInfo = {
  plan: "FREE" | "BASIC" | "PREMIUM";
  remainingCredits: number;
  limits: {
    dailyCredits: number;
    aiMessagesPerDay: number;
    visualInputEnabled: boolean;
    imageGenerationEnabled: boolean;
  };
  creditCosts: {
    chatMessage: number;
    imageGeneration: number;
  };
};

export const subscriptionApi = {
  getInfo: () => call<SubscriptionInfo>({ method: "GET", url: "/api/subscriptions" }),
};
