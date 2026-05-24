import type { FastifyInstance, FastifyReply } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { findStudentByUserId } from "../students/students.service.js";
import { SUBSCRIPTION_LIMITS } from "@edtech/config";

const idParamSchema = z.object({ id: z.string().uuid() });

const completeBodySchema = z.object({
  score: z.number().min(0).max(100).optional(),
});

const aiQuestQuestionSchema = z.object({
  type: z.enum(["choice", "text", "order", "matchstick", "logic"]).optional(),
  q: z.string().trim().min(1).max(1000),
  prompt: z.string().trim().max(1000).optional(),
  options: z.array(z.string().trim().max(300)).max(8).optional(),
  correct: z.number().int().min(0).max(20).optional(),
  answer: z.string().trim().max(300).optional(),
  explanation: z.string().trim().max(1500).optional(),
});

const completeAiQuestBodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(80).optional(),
  gradeBand: z.string().trim().max(20).optional(),
  totalQuestions: z.number().int().min(1).max(10),
  // Kept for backwards compatibility with old clients; intentionally
  // ignored after parsing. The server is the sole authority on scoring
  // (Req 5). If supplied, the value is logged as a warning and dropped.
  correctAnswers: z.number().int().min(0).max(10).optional(),
  answers: z.array(z.union([z.number(), z.string().trim().max(500)])).max(10).optional(),
  questions: z.array(aiQuestQuestionSchema).min(1).max(10),
});

/**
 * Pure helper: count correct answers by comparing each submitted answer
 * against the canonical answer carried on the question. Used as the
 * single source of truth for the AI quest score, regardless of any
 * `correctAnswers` value supplied by the client.
 *
 * Comparison rules:
 * - `choice` (or any question with a numeric `correct` index): submitted
 *   answer must be a number that equals `correct`.
 * - `text` (or any question with a `answer` string): submitted answer
 *   must be a string whose case-insensitive trimmed form matches the
 *   canonical `answer`.
 * - Missing canonical fields → that question is not counted as correct.
 */
export function computeCorrectAnswers(
  questions: Array<z.infer<typeof aiQuestQuestionSchema>>,
  answers: ReadonlyArray<number | string>,
): number {
  let correct = 0;
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const submitted = answers[i];
    if (submitted === undefined) continue;
    if (typeof q.correct === "number" && typeof submitted === "number") {
      if (submitted === q.correct) correct += 1;
      continue;
    }
    if (typeof q.answer === "string" && typeof submitted === "string") {
      if (submitted.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
        correct += 1;
      }
      continue;
    }
  }
  return correct;
}

const XP_BY_DIFFICULTY: Record<string, number> = {
  EASY: 25,
  MEDIUM: 50,
  HARD: 100,
};

async function ensureQuestsEnabled(
  app: FastifyInstance,
  userId: string,
  reply: FastifyReply,
): Promise<boolean> {
  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true },
  });
  if (!user) {
    reply.status(404).send({ success: false, error: "User not found" });
    return false;
  }
  if (!SUBSCRIPTION_LIMITS[user.subscriptionPlan].questsEnabled) {
    reply.status(402).send({
      success: false,
      error: "Квесты доступны во втором тарифе за $40. Во Free доступны только тесты.",
    });
    return false;
  }
  return true;
}

export async function questsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate] }, async () => {
    const quests = await app.prisma.quest.findMany({
      include: { topic: { include: { subject: true } } },
      take: 100,
    });
    return { success: true, data: quests };
  });

  app.post<{ Body: z.infer<typeof completeAiQuestBodySchema> }>(
    "/ai/complete",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const canUseQuests = await ensureQuestsEnabled(app, request.authUser!.userId, reply);
      if (!canUseQuests) return;

      const body = completeAiQuestBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: body.error.errors[0]?.message ?? "Invalid AI quest result",
        });
      }

      // Server-authoritative scoring (Req 5). Any client-supplied
      // ``correctAnswers`` value is ignored and the score is computed
      // from the persisted ``questions`` and ``answers`` of this
      // session. If the client did supply a value, log a warning so
      // anomalous clients are visible.
      const correctAnswersServer = computeCorrectAnswers(
        body.data.questions,
        body.data.answers ?? [],
      );
      if (body.data.correctAnswers !== undefined) {
        request.log.warn(
          {
            discarded: body.data.correctAnswers,
            computed: correctAnswersServer,
          },
          "client-supplied correctAnswers ignored",
        );
      }

      const student = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!student) {
        return reply.status(404).send({ success: false, error: "Student profile not found" });
      }

      const subjectLabel = normalizeSubjectLabel(body.data.subject);
      const subjectSlug = slugFromLabel(subjectLabel);
      let subject = await app.prisma.subject.findFirst({
        where: {
          OR: [
            { nameRu: { equals: subjectLabel, mode: "insensitive" } },
            { nameUz: { equals: subjectLabel, mode: "insensitive" } },
            { slug: { equals: subjectSlug, mode: "insensitive" } },
          ],
        },
      });

      if (!subject) {
        subject = await app.prisma.subject.upsert({
          where: { slug: `ai-${subjectSlug}` },
          create: {
            slug: `ai-${subjectSlug}`,
            nameRu: subjectLabel,
            nameUz: subjectLabel,
            icon: "✨",
          },
          update: {},
        });
      }

      const topic = await app.prisma.topic.upsert({
        where: { id: `ai-${subject.id}-${student.grade}` },
        create: {
          id: `ai-${subject.id}-${student.grade}`,
          subjectId: subject.id,
          nameRu: `${subject.nameRu} — AI-квесты`,
          nameUz: `${subject.nameUz} — AI-kvestlar`,
          grade: student.grade,
          order: 999,
        },
        update: {},
      });

      const score = calculateScore(correctAnswersServer, body.data.totalQuestions);
      const xp = calculateAiQuestXp(correctAnswersServer, body.data.totalQuestions);
      const questId = randomUUID();
      const now = new Date();
      const existingSubjectProgress = await app.prisma.subjectProgress.findUnique({
        where: {
          studentId_subjectId: {
            studentId: student.id,
            subjectId: subject.id,
          },
        },
        select: { score: true, weakTopics: true },
      });
      const subjectScore = mergeSubjectScore(existingSubjectProgress?.score, score);
      const weakTopics = buildWeakTopics(existingSubjectProgress?.weakTopics ?? [], topic.id, score);
      const content = JSON.parse(
        JSON.stringify({
          type: "ai_chat",
          gradeBand: body.data.gradeBand ?? null,
          questions: body.data.questions ?? [],
          answers: body.data.answers ?? [],
          correctAnswers: correctAnswersServer,
        }),
      );

      const [, , , updatedStudent] = await app.prisma.$transaction([
        app.prisma.quest.create({
          data: {
            id: questId,
            topicId: topic.id,
            grade: student.grade,
            nameRu: body.data.title,
            nameUz: body.data.title,
            description: `${subject.nameRu}: ${correctAnswersServer}/${body.data.totalQuestions}, ${score}%`,
            difficulty: body.data.totalQuestions >= 6 ? "MEDIUM" : "EASY",
            xpReward: xp,
            timeLimit: Math.max(5, body.data.totalQuestions * 3),
            content,
          },
        }),
        app.prisma.questProgress.create({
          data: {
            studentId: student.id,
            questId,
            status: "COMPLETED",
            score,
            startedAt: now,
            completedAt: now,
            attempts: 1,
          },
        }),
        app.prisma.subjectProgress.upsert({
          where: {
            studentId_subjectId: {
              studentId: student.id,
              subjectId: subject.id,
            },
          },
          create: {
            studentId: student.id,
            subjectId: subject.id,
            score,
            weakTopics: score < 65 ? [topic.id] : [],
            lastSyncedAt: now,
          },
          update: {
            score: subjectScore,
            weakTopics,
            lastSyncedAt: now,
          },
        }),
        app.prisma.studentProfile.update({
          where: { id: student.id },
          data: {
            xp: { increment: xp },
            lastActiveAt: now,
          },
        }),
      ]);

      return { success: true, data: { questId, score, xpEarned: xp, totalXp: updatedStudent.xp } };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }
      const quest = await app.prisma.quest.findUnique({
        where: { id: params.data.id },
        include: { topic: { include: { subject: true } } },
      });
      if (!quest) return reply.status(404).send({ success: false, error: "Quest not found" });
      return { success: true, data: quest };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/:id/start",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }

      const student = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!student) {
        return reply.status(404).send({ success: false, error: "Student profile not found" });
      }
      const canUseQuests = await ensureQuestsEnabled(app, request.authUser!.userId, reply);
      if (!canUseQuests) return;

      const quest = await app.prisma.quest.findUnique({ where: { id: params.data.id } });
      if (!quest) return reply.status(404).send({ success: false, error: "Quest not found" });

      const progress = await app.prisma.questProgress.upsert({
        where: { studentId_questId: { studentId: student.id, questId: quest.id } },
        create: {
          studentId: student.id,
          questId: quest.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          attempts: 1,
        },
        update: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      return { success: true, data: progress };
    },
  );

  app.post<{ Params: { id: string }; Body: { score?: number } }>(
    "/:id/complete",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }
      const body = completeBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid score" });
      }

      const student = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!student) {
        return reply.status(404).send({ success: false, error: "Student profile not found" });
      }
      const canUseQuests = await ensureQuestsEnabled(app, request.authUser!.userId, reply);
      if (!canUseQuests) return;

      const quest = await app.prisma.quest.findUnique({
        where: { id: params.data.id },
        include: { topic: true },
      });
      if (!quest) return reply.status(404).send({ success: false, error: "Quest not found" });

      // SECURITY: проверяем что quest действительно был запущен этим студентом
      // и ещё не завершён, чтобы пользователь не мог фармить XP постом
      // /complete без прохождения. Атомарная проверка через findFirst.
      const existing = await app.prisma.questProgress.findUnique({
        where: { studentId_questId: { studentId: student.id, questId: quest.id } },
      });
      if (!existing || existing.status !== "IN_PROGRESS") {
        return reply.status(400).send({
          success: false,
          error: "Quest must be started first",
        });
      }

      const xp = quest.xpReward || XP_BY_DIFFICULTY[quest.difficulty] || 50;
      const score = typeof body.data.score === "number" ? Math.round(body.data.score) : 100;
      const now = new Date();
      const existingSubjectProgress = await app.prisma.subjectProgress.findUnique({
        where: {
          studentId_subjectId: {
            studentId: student.id,
            subjectId: quest.topic.subjectId,
          },
        },
        select: { score: true, weakTopics: true },
      });
      const subjectScore = mergeSubjectScore(existingSubjectProgress?.score, score);
      const weakTopics = buildWeakTopics(existingSubjectProgress?.weakTopics ?? [], quest.topic.id, score);

      const [, , updatedStudent] = await app.prisma.$transaction([
        app.prisma.questProgress.update({
          where: { studentId_questId: { studentId: student.id, questId: quest.id } },
          data: {
            status: "COMPLETED",
            completedAt: now,
            score,
          },
        }),
        app.prisma.subjectProgress.upsert({
          where: {
            studentId_subjectId: {
              studentId: student.id,
              subjectId: quest.topic.subjectId,
            },
          },
          create: {
            studentId: student.id,
            subjectId: quest.topic.subjectId,
            score,
            weakTopics: score < 65 ? [quest.topic.id] : [],
            lastSyncedAt: now,
          },
          update: {
            score: subjectScore,
            weakTopics,
            lastSyncedAt: now,
          },
        }),
        app.prisma.studentProfile.update({
          where: { id: student.id },
          data: {
            xp: { increment: xp },
            lastActiveAt: now,
          },
        }),
      ]);

      return { success: true, data: { questId: quest.id, score, xpEarned: xp, totalXp: updatedStudent.xp } };
    },
  );
}

function normalizeSubjectLabel(value?: string) {
  const label = value?.trim();
  return label || "AI-квесты";
}

function slugFromLabel(value: string) {
  return (
    value
      .toLowerCase()
      .replaceAll("ё", "е")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "quests"
  );
}

function calculateScore(correctAnswers: number, totalQuestions: number) {
  return Math.round((Math.min(correctAnswers, totalQuestions) / Math.max(1, totalQuestions)) * 100);
}

function calculateAiQuestXp(correctAnswers: number, totalQuestions: number) {
  const correct = Math.min(correctAnswers, totalQuestions);
  return Math.min(100, correct * 10 + (correct === totalQuestions ? 20 : 0));
}

function mergeSubjectScore(currentScore: number | undefined, latestScore: number) {
  if (typeof currentScore !== "number") return latestScore;
  return Math.round((currentScore * 0.7 + latestScore * 0.3) * 10) / 10;
}

function buildWeakTopics(currentWeakTopics: string[], topicId: string, score: number) {
  if (score < 65) return Array.from(new Set([...currentWeakTopics, topicId]));
  return currentWeakTopics.filter((id) => id !== topicId);
}
