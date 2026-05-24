import type { FastifyInstance } from "fastify";
import { onboardingSchema } from "@edtech/types";
import { ZodError } from "zod";
import { buildStudentAnalytics } from "../../utils/analytics.js";
import { findStudentByUserId, getOrCreateStudentProfile } from "./students.service.js";

export async function studentsRoutes(app: FastifyInstance) {
  app.get(
    "/me",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const profile = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!profile) {
        return reply.status(404).send({ success: false, error: "Student profile not found" });
      }
      return { success: true, data: profile };
    },
  );

  app.post(
    "/me/onboarding",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      let data;
      try {
        data = onboardingSchema.parse(request.body);
      } catch (err) {
        const message =
          err instanceof ZodError ? err.errors[0]?.message : "Invalid payload";
        return reply.status(400).send({ success: false, error: message });
      }

      const profile = await getOrCreateStudentProfile(app.prisma, request.authUser!.userId);

      const updated = await app.prisma.studentProfile.update({
        where: { id: profile.id },
        data: {
          grade: data.grade,
          age: data.age ?? null,
          schoolName: data.schoolName ?? null,
          interests: data.interests,
          favoriteSubjects: data.favoriteSubjects,
          targetProfession: data.targetProfession ?? null,
          careerDirection: data.careerDirection ?? null,
          onboardingComplete: true,
        },
      });

      return { success: true, data: updated };
    },
  );

  app.get(
    "/me/analytics",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const profile = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!profile) {
        return reply.status(404).send({ success: false, error: "Student profile not found" });
      }

      const [subjectProgress, aiSessions, questProgress, totalQuests] = await Promise.all([
        app.prisma.subjectProgress.findMany({
          where: { studentId: profile.id },
          include: { subject: true },
          take: 20,
        }),
        app.prisma.aiSession.findMany({
          where: { studentId: profile.id },
          orderBy: { createdAt: "desc" },
          select: { tokensUsed: true, createdAt: true },
          take: 50,
        }),
        app.prisma.questProgress.findMany({
          where: { studentId: profile.id },
          select: { status: true },
          take: 200,
        }),
        app.prisma.quest.count({ where: { grade: profile.grade } }),
      ]);

      const analytics = buildStudentAnalytics({
        studentProfile: {
          grade: profile.grade,
          age: profile.age,
          schoolName: profile.schoolName,
          xp: profile.xp,
          level: profile.level,
          streakDays: profile.streakDays,
          interests: profile.interests,
          favoriteSubjects: profile.favoriteSubjects,
          targetProfession: profile.targetProfession,
          careerDirection: profile.careerDirection,
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

      return { success: true, data: analytics };
    },
  );

  app.get(
    "/me/quests",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const profile = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!profile) {
        return reply.status(404).send({ success: false, error: "Student profile not found" });
      }

      const quests = await app.prisma.quest.findMany({
        where: { grade: profile.grade },
        include: {
          topic: { include: { subject: true } },
          progress: { where: { studentId: profile.id } },
        },
        take: 50,
      });

      const data = quests.map((q) => {
        const progress = q.progress[0];
        return {
          id: q.id,
          title: q.nameRu,
          description: q.description,
          subject: q.topic.subject.nameRu,
          difficulty: q.difficulty,
          estimatedTime: q.timeLimit ?? 25,
          xpReward: q.xpReward,
          status: progress?.status ?? "NOT_STARTED",
          progress: progress?.score != null ? Math.round(progress.score) : 0,
        };
      });

      return { success: true, data };
    },
  );
}
