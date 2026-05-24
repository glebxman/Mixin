import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildStudentAnalytics, generateAiFeedback } from "../../utils/analytics.js";
import { verifyParentLinkCode } from "../../utils/parent-link-code.js";

const idParamSchema = z.object({ id: z.string().uuid() });
const linkChildSchema = z.object({ code: z.string().trim().min(16).max(512) });

export async function parentRoutes(app: FastifyInstance) {
  app.get(
    "/children",
    { preHandler: [app.authenticate, app.requireRole("PARENT")] },
    async (request, reply) => {
      const parent = await app.prisma.parentProfile.findUnique({
        where: { userId: request.authUser!.userId },
        include: {
          children: {
            include: {
              student: { include: { user: { include: { profile: true } } } },
            },
          },
        },
      });

      if (!parent) {
        return reply.status(404).send({ success: false, error: "Parent profile not found" });
      }

      const data = parent.children.map((link) => ({
        id: link.student.id,
        userId: link.student.userId,
        firstName: link.student.user.profile?.firstName ?? "",
        lastName: link.student.user.profile?.lastName ?? "",
        grade: link.student.grade,
        schoolName: link.student.schoolName,
        xp: link.student.xp,
        level: link.student.level,
        streakDays: link.student.streakDays,
      }));

      return { success: true, data };
    },
  );

  app.post(
    "/children/link",
    { preHandler: [app.authenticate, app.requireRole("PARENT")] },
    async (request, reply) => {
      const body = linkChildSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid link code" });
      }

      const verified = verifyParentLinkCode(body.data.code);
      if (!verified) {
        return reply.status(400).send({ success: false, error: "Link code is invalid or expired" });
      }

      const [parent, student] = await Promise.all([
        app.prisma.parentProfile.findUnique({
          where: { userId: request.authUser!.userId },
        }),
        app.prisma.studentProfile.findUnique({
          where: { id: verified.studentId },
          include: { user: { include: { profile: true } } },
        }),
      ]);

      if (!parent) {
        return reply.status(404).send({ success: false, error: "Parent profile not found" });
      }
      if (!student) {
        return reply.status(404).send({ success: false, error: "Student not found" });
      }

      await app.prisma.parentStudentLink.upsert({
        where: {
          parentId_studentId: {
            parentId: parent.id,
            studentId: student.id,
          },
        },
        create: {
          parentId: parent.id,
          studentId: student.id,
        },
        update: {},
      });

      return {
        success: true,
        data: {
          id: student.id,
          userId: student.userId,
          firstName: student.user.profile?.firstName ?? "",
          lastName: student.user.profile?.lastName ?? "",
          grade: student.grade,
          schoolName: student.schoolName,
          xp: student.xp,
          level: student.level,
          streakDays: student.streakDays,
        },
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/children/:id",
    { preHandler: [app.authenticate, app.requireRole("PARENT")] },
    async (request, reply) => {
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }

      const parent = await app.prisma.parentProfile.findUnique({
        where: { userId: request.authUser!.userId },
      });
      if (!parent) {
        return reply.status(404).send({ success: false, error: "Parent profile not found" });
      }

      const link = await app.prisma.parentStudentLink.findFirst({
        where: { parentId: parent.id, studentId: params.data.id },
        include: {
          student: { include: { user: { include: { profile: true } } } },
        },
      });

      // SECURITY: 404 (а не 403) при отсутствии связи —
      // не раскрываем существование других студентов.
      if (!link) {
        return reply.status(404).send({ success: false, error: "Not found" });
      }

      const child = link.student;

      const [subjectProgress, aiSessions, questProgress, totalQuests] = await Promise.all([
        app.prisma.subjectProgress.findMany({
          where: { studentId: child.id },
          include: { subject: true },
          take: 20,
        }),
        // Keep this in sync with student analytics: avoid loading large message JSON.
        app.prisma.aiSession.findMany({
          where: { studentId: child.id },
          orderBy: { createdAt: "desc" },
          select: { tokensUsed: true, createdAt: true },
          take: 50,
        }),
        app.prisma.questProgress.findMany({
          where: { studentId: child.id },
          select: { status: true },
          take: 200,
        }),
        app.prisma.quest.count({ where: { grade: child.grade } }),
      ]);

      const analytics = buildStudentAnalytics({
        studentProfile: {
          grade: child.grade,
          age: child.age,
          schoolName: child.schoolName,
          xp: child.xp,
          level: child.level,
          streakDays: child.streakDays,
          interests: child.interests,
          favoriteSubjects: child.favoriteSubjects,
          targetProfession: child.targetProfession,
          careerDirection: child.careerDirection,
        },
        subjectProgress: subjectProgress.map((p) => ({
          subject: { nameRu: p.subject.nameRu },
          score: p.score,
          weakTopics: p.weakTopics,
        })),
        aiSessions: aiSessions.map((s) => ({
          tokensUsed: s.tokensUsed,
          createdAt: s.createdAt,
        })),
        questProgress: questProgress.map((q) => ({ status: q.status })),
        totalQuests,
      });

      const cacheKey = `student:analytics:ai-feedback:${child.id}`;
      let aiFeedbackRaw = await app.redis.get(cacheKey);
      let aiFeedback;

      if (aiFeedbackRaw) {
        try {
          aiFeedback = JSON.parse(aiFeedbackRaw);
        } catch {
          aiFeedback = null;
        }
      }

      if (!aiFeedback) {
        aiFeedback = await generateAiFeedback(analytics);
        await app.redis.set(cacheKey, JSON.stringify(aiFeedback), "EX", 7200);
      }

      const responseData = {
        ...analytics,
        aiAnalysisStudent: aiFeedback.aiAnalysisStudent,
        aiAnalysisParent: aiFeedback.aiAnalysisParent,
      };

      return {
        success: true,
        data: {
          child: {
            id: child.id,
            userId: child.userId,
            firstName: child.user.profile?.firstName ?? "",
            lastName: child.user.profile?.lastName ?? "",
            grade: child.grade,
            schoolName: child.schoolName,
            xp: child.xp,
            level: child.level,
            streakDays: child.streakDays,
          },
          analytics: responseData,
        },
      };
    },
  );

  app.get(
    "/recommendations",
    { preHandler: [app.authenticate, app.requireRole("PARENT")] },
    async (request, reply) => {
      const parent = await app.prisma.parentProfile.findUnique({
        where: { userId: request.authUser!.userId },
        include: {
          children: {
            include: {
              student: {
                include: { subjectProgress: { include: { subject: true } } },
              },
            },
          },
        },
      });

      if (!parent) {
        return reply.status(404).send({ success: false, error: "Parent profile not found" });
      }

      const subjectScores = parent.children.flatMap((link) =>
        link.student.subjectProgress.map((p) => ({
          subject: p.subject.nameRu,
          score: p.score,
        })),
      );

      const learning = subjectScores
        .filter((s) => s.score < 70)
        .slice(0, 3)
        .map((s) => ({
          title: `Уделите внимание: ${s.subject.toLowerCase()}`,
          description: `Текущий уровень — ${Math.round(s.score)}%. Рекомендуем 30 минут в день.`,
          priority: s.score < 60 ? ("high" as const) : ("medium" as const),
        }));

      const career = subjectScores
        .filter((s) => s.score >= 85)
        .slice(0, 3)
        .map((s) => ({
          title: `Развивайте сильную сторону: ${s.subject.toLowerCase()}`,
          description: `Уровень ${Math.round(s.score)}%. Стоит подумать о профильных кружках или олимпиадах.`,
          priority: "low" as const,
        }));

      const data = [
        { category: "learning", items: learning.length ? learning : defaultLearning },
        { category: "career", items: career.length ? career : defaultCareer },
        { category: "health", items: defaultHealth },
      ];

      return { success: true, data };
    },
  );
}

const defaultLearning = [
  {
    title: "Поддерживайте регулярность занятий",
    description: "Стабильность приносит больший эффект, чем длинные интенсивы.",
    priority: "medium" as const,
  },
];
const defaultCareer = [
  {
    title: "Обсудите с ребёнком его интересы",
    description: "Чем чаще вы говорите про будущую профессию — тем точнее AI подбирает рекомендации.",
    priority: "low" as const,
  },
];
const defaultHealth = [
  {
    title: "Баланс учёбы и отдыха",
    description: "Контролируйте время за экраном и поощряйте физическую активность.",
    priority: "medium" as const,
  },
];
