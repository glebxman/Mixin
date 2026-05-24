import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────

export const RoleEnum = z.enum([
  "STUDENT",
  "PARENT",
  "SUPER_ADMIN",
]);
export type Role = z.infer<typeof RoleEnum>;

export const GradeEnum = z.enum([
  "G1", "G2", "G3", "G4", "G5", "G6",
  "G7", "G8", "G9", "G10", "G11",
]);
export type Grade = z.infer<typeof GradeEnum>;

export const SubscriptionPlanEnum = z.enum(["FREE", "BASIC", "PREMIUM"]);
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanEnum>;

export const QuestDifficultyEnum = z.enum(["EASY", "MEDIUM", "HARD"]);
export type QuestDifficulty = z.infer<typeof QuestDifficultyEnum>;

export const QuestStatusEnum = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
]);
export type QuestStatus = z.infer<typeof QuestStatusEnum>;

export const PaymentStatusEnum = z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const NotificationTypeEnum = z.enum([
  "ACHIEVEMENT",
  "REMINDER",
  "SYSTEM",
  "PARENT_REPORT",
]);
export type NotificationType = z.infer<typeof NotificationTypeEnum>;

export const LanguageEnum = z.enum(["ru", "uz", "uz-Cyrl", "en"]);
export type Language = z.infer<typeof LanguageEnum>;

// ─── Auth ────────────────────────────────────────────────────

/**
 * Пароль: минимум 8 символов, должна быть буква и цифра.
 * Дальше можно подключить zxcvbn для проверки на слабые пароли,
 * но даже это базовая защита от тривиальных подборов.
 */
const passwordSchema = z
  .string()
  .min(8, "Пароль минимум 8 символов")
  .max(128, "Пароль слишком длинный")
  .regex(/[A-Za-zА-Яа-я]/, "Пароль должен содержать буквы")
  .regex(/[0-9]/, "Пароль должен содержать цифру");

export const loginSchema = z.object({
  // На login достаточно min(1), чтобы не блокировать старых пользователей
  // со слабыми паролями (для них показываем «обновите пароль» отдельно).
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: passwordSchema,
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(1).max(64),
  role: RoleEnum,
  grade: GradeEnum.optional(),
  schoolName: z.string().max(200).optional(),
  phone: z.string().max(32).optional(),
  language: LanguageEnum.default("ru"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Onboarding (детальная анкета ученика) ───────────────────

export const onboardingSchema = z.object({
  grade: GradeEnum,
  age: z.number().int().min(5).max(20).optional(),
  schoolName: z.string().max(200).optional(),
  interests: z.array(z.string().max(64)).max(20).default([]),
  favoriteSubjects: z.array(z.string().max(64)).max(20).default([]),
  // Профориентация необязательна для начальной школы (G1-G6).
  // Со средних классов (G7+) фронт показывает обязательным.
  targetProfession: z.string().max(120).optional(),
  careerDirection: z.string().max(120).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ─── API Response ────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// ─── Шаблон chat-сообщения (унифицирован между фронтом/AI) ───

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
