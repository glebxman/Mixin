/**
 * Общие хелперы для AI-роутов: схема входа, ratelimit, lazy-load
 * сессии, вызов AI-сервиса, сохранение результата.
 *
 * Цель — оставить в ai.routes.ts только маршруты с минимумом
 * бойлерплейта, без дублирования логики между /chat и /chat/stream.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { CREDIT_COSTS, SUBSCRIPTION_LIMITS } from "@edtech/config";
import { findStudentByUserId } from "../students/students.service.js";
import { consumeDailyCredits } from "../../utils/credits.js";

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
});

export const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().uuid().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  images: z
    .array(
      z.object({
        type: z.literal("image"),
        dataUrl: z.string().startsWith("data:image/").max(1_500_000),
        mimeType: z.string().max(80),
        name: z.string().max(200).optional(),
      }),
    )
    .max(1)
    .optional(),
});

export type ChatPayload = z.infer<typeof chatSchema>;

export type AIServiceResponse = {
  reply: string;
  tokens_used: number;
  actions: {
    questProposal: { topic: string; confidence: number } | null;
    quickCheck: boolean;
    hasVisual: boolean;
    imagePrompt?: string | null;
  };
  state: {
    topic: string | null;
    confidence: number;
    messagesOnTopic: number;
  };
};

export type StoredMessage = { role: "user" | "assistant" | "system"; content: string };

const AI_DAILY_LIMIT_PREFIX = "ai:daily:";
export const AI_HISTORY_LIMIT = 24;

const RATELIMIT_LUA = `
  local current = tonumber(redis.call('get', KEYS[1]) or '0')
  local limit = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])
  if current >= limit then return { 0, current } end
  local next = redis.call('incr', KEYS[1])
  if next == 1 then redis.call('expire', KEYS[1], ttl) end
  return { 1, next }
`;

export async function checkAndIncrementDailyLimit(
  app: FastifyInstance,
  userId: string,
  limit: number,
): Promise<{ allowed: boolean; used: number }> {
  if (process.env.AI_RATE_LIMIT_DISABLED === "true") {
    if (process.env.NODE_ENV === "production") {
      app.log.warn(
        { userId },
        "AI rate limit bypassed (AI_RATE_LIMIT_DISABLED=true in production)",
      );
    }
    return { allowed: true, used: 0 };
  }
  if (limit < 0) return { allowed: true, used: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const key = `${AI_DAILY_LIMIT_PREFIX}${userId}:${today}`;

  const result = (await app.redis.eval(
    RATELIMIT_LUA,
    1,
    key,
    String(limit),
    String(60 * 60 * 26),
  )) as [number, number];

  return { allowed: result[0] === 1, used: result[1] };
}

/**
 * Загружает или создаёт AiSession, проверяет владение и достаёт историю.
 * Возвращает sentinel-объект, который описывает что вернуть клиенту в случае ошибки.
 */
export type SessionContext = {
  session: { id: string; studentId: string; messages: unknown };
  storedMessages: unknown[];
  history: StoredMessage[];
};

export async function loadOrCreateSession(
  app: FastifyInstance,
  studentId: string,
  payload: ChatPayload,
): Promise<
  | { ok: true; ctx: SessionContext }
  | { ok: false; status: number; error: string }
> {
  let session = payload.sessionId
    ? await app.prisma.aiSession.findUnique({
        where: { id: payload.sessionId },
        select: { id: true, studentId: true, messages: true },
      })
    : null;

  if (session && session.studentId !== studentId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  let storedMessages: unknown[] = [];
  let history: StoredMessage[] = [];

  if (session && Array.isArray(session.messages)) {
    storedMessages = session.messages as unknown[];
    history = (session.messages as StoredMessage[])
      .filter(
        (m) =>
          m &&
          typeof m.content === "string" &&
          ["user", "assistant", "system"].includes(m.role),
      )
      .slice(-AI_HISTORY_LIMIT);
  }

  if (!session) {
    session = await app.prisma.aiSession.create({
      data: {
        studentId,
        subjectId: payload.subjectId ?? null,
        messages: [],
      },
      select: { id: true, studentId: true, messages: true },
    });
  }

  return { ok: true, ctx: { session, storedMessages, history } };
}

export type StudentUser = {
  studentId: string;
  subscriptionPlan: keyof typeof SUBSCRIPTION_LIMITS;
};

/**
 * Подгружает студента и пользователя за один Promise.all.
 * Отдаёт reply.send напрямую при ошибке, чтобы caller сразу мог return-нуть.
 */
export async function resolveStudentAndUser(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<StudentUser | null> {
  const userId = request.authUser!.userId;
  const [student, user] = await Promise.all([
    findStudentByUserId(app.prisma, userId),
    app.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlan: true },
    }),
  ]);

  if (!student) {
    reply.status(404).send({ success: false, error: "Student profile not found" });
    return null;
  }
  if (!user) {
    reply.status(404).send({ success: false, error: "User not found" });
    return null;
  }

  return { studentId: student.id, subscriptionPlan: user.subscriptionPlan };
}

export async function enforceChatRateLimit(
  app: FastifyInstance,
  userId: string,
  plan: keyof typeof SUBSCRIPTION_LIMITS,
  reply: FastifyReply,
): Promise<boolean> {
  const planLimits = SUBSCRIPTION_LIMITS[plan];
  const limit = planLimits.aiMessagesPerDay;
  const { allowed } = await checkAndIncrementDailyLimit(app, userId, limit);
  if (!allowed) {
    reply.status(429).send({
      success: false,
      error: `Превышен дневной лимит сообщений (${limit}). Обновите подписку.`,
    });
    return false;
  }
  return true;
}

export async function consumeChatCredits(
  app: FastifyInstance,
  userId: string,
  plan: keyof typeof SUBSCRIPTION_LIMITS,
  reply: FastifyReply,
): Promise<boolean> {
  const planLimits = SUBSCRIPTION_LIMITS[plan];
  const credits = await consumeDailyCredits(
    app,
    userId,
    planLimits.dailyCredits,
    CREDIT_COSTS.chatMessage,
  );
  if (!credits.allowed) {
    reply.status(402).send({
      success: false,
      error: `Недостаточно кредитов. Сообщение стоит ${CREDIT_COSTS.chatMessage} кредит.`,
    });
    return false;
  }
  return true;
}

export type AIServiceCallInput = {
  studentId: string;
  sessionId: string;
  payload: ChatPayload;
  history: StoredMessage[];
  studentFirstName: string | null;
  studentLanguage: string | null;
  studentGrade: number | null;
};

export async function callAIService(
  input: AIServiceCallInput,
): Promise<AIServiceResponse> {
  const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;

  const response = await fetch(`${aiUrl}/api/chat/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(internalToken ? { "X-Internal-Token": internalToken } : {}),
    },
    body: JSON.stringify({
      student_id: input.studentId,
      session_id: input.sessionId,
      message: input.payload.message,
      subject_id: input.payload.subjectId ?? null,
      history: input.history,
      student_first_name: input.studentFirstName,
      student_language: input.studentLanguage ?? null,
      student_grade: input.studentGrade ?? null,
      images: input.payload.images ?? [],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error(text || `AI service responded ${response.status}`);
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }

  return (await response.json()) as AIServiceResponse;
}

export async function persistChatTurn(
  app: FastifyInstance,
  args: {
    sessionId: string;
    studentId: string;
    storedMessages: unknown[];
    payload: ChatPayload;
    aiReply: string;
    tokensUsed: number;
  },
): Promise<void> {
  const newMessages = [
    ...args.storedMessages,
    {
      role: "user",
      content: args.payload.message,
      attachments: args.payload.images ?? [],
    },
    { role: "assistant", content: args.aiReply },
  ];

  await Promise.all([
    app.prisma.aiSession.update({
      where: { id: args.sessionId },
      data: {
        tokensUsed: { increment: args.tokensUsed },
        messages: newMessages,
      },
    }),
    app.prisma.studentProfile.update({
      where: { id: args.studentId },
      data: { lastActiveAt: new Date(), xp: { increment: 5 } },
    }),
  ]);
}

export async function getStudentFirstName(
  app: FastifyInstance,
  userId: string,
): Promise<string | null> {
  const profile = await app.prisma.profile.findFirst({
    where: { userId },
    select: { firstName: true },
  });
  return profile?.firstName ?? null;
}

export async function getStudentLearningContext(
  app: FastifyInstance,
  userId: string,
  studentId: string,
): Promise<{ language: string | null; grade: number | null }> {
  const [profile, student] = await Promise.all([
    app.prisma.profile.findFirst({
      where: { userId },
      select: { language: true },
    }),
    app.prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { grade: true },
    }),
  ]);

  // Profile.language: "ru" | "uz" | "en" — RAG корпус ru/uz, en маппим к ru.
  let language: string | null = profile?.language ?? null;
  if (language === "en") language = "ru";
  if (language && !["ru", "uz"].includes(language)) language = null;

  // StudentProfile.grade хранится как "G7"; RAG ждёт целое 1..11.
  let grade: number | null = null;
  const raw = student?.grade as string | undefined;
  if (raw && raw.startsWith("G")) {
    const n = Number(raw.slice(1));
    if (Number.isFinite(n) && n >= 1 && n <= 11) grade = n;
  }

  return { language, grade };
}

export function encodeStreamEvent(event: unknown): string {
  return `${JSON.stringify(event)}\n`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const STREAM_CHUNK_SIZE = 24;
export const STREAM_DELAY_MS = 8;
