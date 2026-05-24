import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireStudent } from "../students/students.service.js";
import { CREDIT_COSTS, SUBSCRIPTION_LIMITS } from "@edtech/config";
import { consumeDailyCredits } from "../../utils/credits.js";
import { incrementDailyCounter } from "../../utils/redis-rate-limit.js";

const generateImageSchema = z.object({
  prompt: z.string().min(1).max(500),
  sessionId: z.string().uuid().optional(),
});

const IMAGE_DAILY_LIMIT_PREFIX = "ai:image:daily:";
type StoredImageMessage = {
  role: "image";
  content: "";
  createdAt: string;
  image: {
    dataUrl: string;
    prompt: string;
    model: string;
  };
};

/**
 * Лимит на генерацию изображений отдельный от чата:
 * это дорогая операция (даже на free-tier).
 */
const IMAGE_LIMITS = {
  FREE: 6,
  BASIC: 10,
  PREMIUM: 10,
} as const;

async function checkAndIncrementImageLimit(
  app: FastifyInstance,
  userId: string,
  limit: number,
): Promise<{ allowed: boolean; used: number }> {
  return incrementDailyCounter(app, {
    keyPrefix: IMAGE_DAILY_LIMIT_PREFIX,
    userId,
    limit,
  });
}

// consumeDailyCredits imported from ../../utils/credits.ts

export async function aiImageRoutes(app: FastifyInstance) {
  app.post(
    "/generate-image",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const parse = generateImageSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          success: false,
          error: parse.error.errors[0]?.message ?? "Invalid prompt",
        });
      }

      const userId = request.authUser!.userId;
      const student = await requireStudent(app, request, reply);
      if (!student) return;

      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionPlan: true },
      });
      if (!user) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }

      const session = parse.data.sessionId
        ? await app.prisma.aiSession.findUnique({
            where: { id: parse.data.sessionId },
            select: { id: true, studentId: true, messages: true },
          })
        : null;

      if (parse.data.sessionId && !session) {
        return reply.status(404).send({ success: false, error: "Session not found" });
      }
      if (session && session.studentId !== student.id) {
        return reply.status(403).send({ success: false, error: "Forbidden" });
      }

      const limit = IMAGE_LIMITS[user.subscriptionPlan];
      const { allowed } = await checkAndIncrementImageLimit(app, userId, limit);
      if (!allowed) {
        return reply.status(429).send({
          success: false,
          error: `Превышен дневной лимит генерации изображений (${limit}). Обновите подписку.`,
        });
      }

      const credits = await consumeDailyCredits(
        app,
        userId,
        SUBSCRIPTION_LIMITS[user.subscriptionPlan].dailyCredits,
        CREDIT_COSTS.image,
      );
      if (!credits.allowed) {
        return reply.status(402).send({
          success: false,
          error: `Недостаточно кредитов. Картинка стоит ${CREDIT_COSTS.image} кредитов.`,
        });
      }

      const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
      const internalToken = process.env.INTERNAL_SERVICE_TOKEN;

      try {
        const response = await fetch(`${aiUrl}/api/images/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(internalToken ? { "X-Internal-Token": internalToken } : {}),
          },
          body: JSON.stringify({
            prompt: parse.data.prompt,
            student_age: student.age,
          }),
          signal: AbortSignal.timeout(90_000),
        });

        if (!response.ok) {
          const text = await response.text();
          app.log.warn(
            { status: response.status, body: text.slice(0, 500) },
            "image-service responded with error",
          );
          if (response.status === 429) {
            return reply.status(429).send({
              success: false,
              error: "Модель изображений сейчас перегружена. Попробуйте через минуту.",
            });
          }
          let detail = "Не удалось сгенерировать изображение.";
          try {
            const parsed = JSON.parse(text) as { detail?: string };
            if (parsed.detail) detail = parsed.detail;
          } catch {
            /* not JSON */
          }
          return reply.status(502).send({ success: false, error: detail });
        }

        const data = (await response.json()) as {
          dataUrl: string;
          prompt: string;
          model: string;
        };

        if (session) {
          const previousMessages = Array.isArray(session.messages)
            ? session.messages
            : [];
          const imageMessage: StoredImageMessage = {
            role: "image",
            content: "",
            createdAt: new Date().toISOString(),
            image: {
              dataUrl: data.dataUrl,
              prompt: data.prompt,
              model: data.model,
            },
          };

          await app.prisma.aiSession.update({
            where: { id: session.id },
            data: {
              messages: [...previousMessages, imageMessage],
            },
          });
        }

        return { success: true, data };
      } catch (err) {
        app.log.error(
          { err: { message: (err as Error).message } },
          "failed to call image-service",
        );
        return reply.status(502).send({
          success: false,
          error: "AI-сервис изображений недоступен.",
        });
      }
    },
  );
}
