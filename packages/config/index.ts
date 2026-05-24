// ─── App ─────────────────────────────────────────────────────

export const APP_NAME = "Mixin EdTech UZ";

// ─── Internal service URLs (server-side) ─────────────────────

export const API_PORT = parseInt(process.env.API_PORT || "3001", 10);
export const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://localhost:8000";
export const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://localhost:3002";
export const INTEGRATIONS_SERVICE_URL =
  process.env.INTEGRATIONS_SERVICE_URL || "http://localhost:3003";

// ─── JWT ─────────────────────────────────────────────────────

export const JWT_ACCESS_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || "15m";
export const JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "30d";

// ─── Roles ───────────────────────────────────────────────────

export const ROLES = ["STUDENT", "PARENT", "SUPER_ADMIN"] as const;
export type AppRole = (typeof ROLES)[number];

// Базовые URL панелей для редиректов после логина / по ролям.
// Источник истины — env, fallback — localhost-порты.
export const ROLE_REDIRECTS: Record<AppRole, string> = {
  STUDENT:
    process.env.NEXT_PUBLIC_STUDENT_URL ||
    process.env.VITE_STUDENT_URL ||
    "http://localhost:3100",
  PARENT:
    process.env.NEXT_PUBLIC_PARENT_URL ||
    process.env.VITE_PARENT_URL ||
    "http://localhost:3200",
  SUPER_ADMIN:
    process.env.NEXT_PUBLIC_ADMIN_URL ||
    process.env.VITE_ADMIN_URL ||
    "http://localhost:3400",
};

export function getRoleRedirect(role: string): string {
  return ROLE_REDIRECTS[role as AppRole] || ROLE_REDIRECTS.STUDENT;
}

// ─── i18n ────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = ["ru", "uz", "uz-Cyrl", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = "ru";

// ─── Образование ─────────────────────────────────────────────

export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
export type GradeNumber = (typeof GRADES)[number];

// Возраст, начиная с которого включаем профориентацию
export const CAREER_DISCOVERY_FROM_GRADE = 7;

// ─── Геймификация ────────────────────────────────────────────

export const QUEST_XP = {
  EASY: 25,
  MEDIUM: 50,
  HARD: 100,
} as const;

// ─── Подписки ────────────────────────────────────────────────

/**
 * Дневные лимиты сообщений и квестов по тарифу.
 * Можно переопределить через env (см. .env.example):
 *   AI_FREE_MESSAGES_PER_DAY
 *   AI_BASIC_MESSAGES_PER_DAY
 *   AI_PREMIUM_MESSAGES_PER_DAY
 *
 * Глобально отключается AI_RATE_LIMIT_DISABLED=true (для разработки).
 *
 * Значение -1 (или любое отрицательное) = unlimited.
 */
function readLimit(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const SUBSCRIPTION_LIMITS = {
  FREE: {
    dailyCredits: readLimit("AI_FREE_DAILY_CREDITS", 300),
    bonusCreditsOnPurchase: 0,
    testsEnabled: true,
    questsEnabled: false,
    aiMessagesPerDay: readLimit("AI_FREE_MESSAGES_PER_DAY", 300),
    questsPerDay: 0,
  },
  BASIC: {
    dailyCredits: readLimit("AI_BASIC_DAILY_CREDITS", 500),
    bonusCreditsOnPurchase: readLimit("AI_BASIC_BONUS_CREDITS", 8000),
    testsEnabled: true,
    questsEnabled: false,
    aiMessagesPerDay: readLimit("AI_BASIC_MESSAGES_PER_DAY", 500),
    questsPerDay: 0,
  },
  PREMIUM: {
    dailyCredits: readLimit("AI_PREMIUM_DAILY_CREDITS", 500),
    bonusCreditsOnPurchase: readLimit("AI_PREMIUM_BONUS_CREDITS", 8000),
    testsEnabled: true,
    questsEnabled: true,
    aiMessagesPerDay: readLimit("AI_PREMIUM_MESSAGES_PER_DAY", 500),
    questsPerDay: -1,
  },
} as const;

export const CREDIT_COSTS = {
  chatMessage: readLimit("AI_CHAT_MESSAGE_CREDITS", 4),
  image: readLimit("AI_IMAGE_CREDITS", 50),
  video: readLimit("AI_VIDEO_CREDITS", 300),
  test: readLimit("AI_TEST_CREDITS", 0),
  quest: readLimit("AI_QUEST_CREDITS", 25),
} as const;

export const CREDIT_PACK_OPTIONS = [
  1000, 2000, 4000, 8000, 12000, 16000, 24000, 40000, 80000,
] as const;

export const CREDIT_PLAN_BASE_PRICE_USD = 40;
export const QUEST_PLAN_PRICE_USD = 40;

export const AI_RATE_LIMIT_DISABLED =
  process.env.AI_RATE_LIMIT_DISABLED === "true";

// ─── AI ──────────────────────────────────────────────────────

// Единая точка истины для модели AI.
export const AI_MODEL_NAME =
  process.env.OPENROUTER_MODEL;

export const AI_BASE_URL =
  process.env.OPENROUTER_BASE_URL;

// ─── Cookies ─────────────────────────────────────────────────

export const COOKIE_PREFIX =
  process.env.NODE_ENV === "production" ? "__Host-" : "";

export const ACCESS_TOKEN_COOKIE = `${COOKIE_PREFIX}edtech_access_token`;
export const REFRESH_TOKEN_COOKIE = `${COOKIE_PREFIX}edtech_refresh_token`;
export const ROLE_COOKIE = `${COOKIE_PREFIX}edtech_role`;
export const CSRF_COOKIE = `${COOKIE_PREFIX}edtech_csrf`;

// ─── Storage / Vector ────────────────────────────────────────

export const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION || "textbooks";
