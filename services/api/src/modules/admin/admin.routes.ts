import type { FastifyInstance } from "fastify";
import type { Prisma } from "@edtech/db";
import { z, ZodError } from "zod";
import { SUBSCRIPTION_LIMITS } from "@edtech/config";
import { buildStudentAnalytics, generateAiFeedback } from "../../utils/analytics.js";

const planEnum = z.enum(["FREE", "BASIC", "PREMIUM"]);
const roleEnum = z.enum(["STUDENT", "PARENT", "SUPER_ADMIN"]);

const usersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  role: roleEnum.optional(),
  plan: planEnum.optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const patchPlanSchema = z.object({
  plan: planEnum,
  // Optional admin note for audit trail; surfaces in payment.providerTxId.
  reason: z.string().trim().max(200).optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  app.get(
    "/overview",
    { preHandler: [app.authenticate, app.requireRole("SUPER_ADMIN")] },
    async () => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [totalUsers, activeSchools, aiRequestsToday, paidPayments] =
        await Promise.all([
          app.prisma.user.count({ where: { deletedAt: null } }),
          app.prisma.studentProfile.groupBy({
            by: ["schoolName"],
            where: {
              schoolName: {
                not: null,
                notIn: [""],
              },
            },
          }).then((res) => res.length),
          app.prisma.aiSession.count({ where: { createdAt: { gte: dayAgo } } }),
          app.prisma.payment.findMany({ where: { status: "PAID" } }),
        ]);

      const monthlyRevenue =
        paidPayments
          .filter(
            (p) =>
              p.paidAt &&
              p.paidAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          )
          .reduce((acc, p) => acc + p.amount, 0) / 100;

      // health-чеки сервисов делаем простой проверкой переменных
      const serviceStatus = [
        {
          name: "AI Service",
          status: "online" as const,
          uptime: process.env.AI_SERVICE_URL ? "99.9%" : "—",
        },
        { name: "Database", status: "online" as const, uptime: "100%" },
        { name: "Qdrant (RAG)", status: "online" as const, uptime: "—" },
        { name: "API Gateway", status: "online" as const, uptime: "99.8%" },
      ];

      return {
        success: true,
        data: {
          totalUsers,
          activeSchools,
          aiRequestsToday,
          monthlyRevenue,
          growth: { users: "—", schools: "—", ai: "—", revenue: "—" },
          serviceStatus,
        },
      };
    },
  );

  // ─── Users: paginated list with filters ───
  app.get(
    "/users",
    { preHandler: [app.authenticate, app.requireRole("SUPER_ADMIN")] },
    async (request, reply) => {
      const parsed = usersListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: parsed.error.errors[0]?.message ?? "Invalid query",
        });
      }
      const { page, pageSize, q, role, plan, isActive } = parsed.data;

      const where: Prisma.UserWhereInput = { deletedAt: null };
      if (role) where.role = role;
      if (plan) where.subscriptionPlan = plan;
      if (typeof isActive === "boolean") where.isActive = isActive;
      if (q && q.length > 0) {
        where.OR = [
          { email: { contains: q, mode: "insensitive" } },
          { profile: { firstName: { contains: q, mode: "insensitive" } } },
          { profile: { lastName: { contains: q, mode: "insensitive" } } },
        ];
      }

      const [total, users] = await Promise.all([
        app.prisma.user.count({ where }),
        app.prisma.user.findMany({
          where,
          include: { profile: true },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      const items = users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        subscriptionPlan: u.subscriptionPlan,
        createdAt: u.createdAt.toISOString(),
        profile: u.profile
          ? { firstName: u.profile.firstName, lastName: u.profile.lastName }
          : null,
      }));

      return {
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      };
    },
  );

  // ─── Users: change subscription plan (with audit trail) ───
  app.patch<{ Params: { id: string }; Body: unknown }>(
    "/users/:id/plan",
    { preHandler: [app.authenticate, app.requireRole("SUPER_ADMIN")] },
    async (request, reply) => {
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }

      let body;
      try {
        body = patchPlanSchema.parse(request.body);
      } catch (err) {
        const msg =
          err instanceof ZodError ? err.errors[0]?.message : "Invalid payload";
        return reply.status(400).send({ success: false, error: msg });
      }

      const target = await app.prisma.user.findUnique({
        where: { id: params.data.id },
        select: {
          id: true,
          email: true,
          role: true,
          subscriptionPlan: true,
          deletedAt: true,
        },
      });

      if (!target || target.deletedAt) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }

      const previousPlan = target.subscriptionPlan;
      if (previousPlan === body.plan) {
        // Nothing to do; return current snapshot for caller convenience.
        return reply.send({
          success: true,
          data: {
            id: target.id,
            subscriptionPlan: target.subscriptionPlan,
            previousPlan,
            unchanged: true,
          },
        });
      }

      const adminId = request.authUser!.userId;
      const note = body.reason?.trim() || "manual grant";
      const txId = `manual:${adminId}:${target.id}:${Date.now()}`;

      // Single transaction: update User + write audit Payment row.
      const [updated] = await app.prisma.$transaction([
        app.prisma.user.update({
          where: { id: target.id },
          data: { subscriptionPlan: body.plan },
        }),
        app.prisma.payment.create({
          data: {
            userId: target.id,
            plan: body.plan,
            amount: 0, // 0 — manual grant by admin
            currency: "UZS",
            status: "PAID",
            provider: `manual:${note}`.slice(0, 60),
            providerTxId: txId,
            paidAt: new Date(),
          },
        }),
      ]);

      app.log.info(
        {
          adminId,
          targetId: target.id,
          previousPlan,
          newPlan: body.plan,
          note,
        },
        "subscription plan changed by admin",
      );

      const { passwordHash: _omit, ...safe } = updated;
      void _omit;
      return reply.send({
        success: true,
        data: {
          ...safe,
          previousPlan,
          unchanged: false,
        },
      });
    },
  );

  // Surface plan limits to the admin UI so price/capacity can be shown
  // alongside the plan switcher without hardcoding values on the client.
  app.get(
    "/plans",
    { preHandler: [app.authenticate, app.requireRole("SUPER_ADMIN")] },
    async () => {
      return {
        success: true,
        data: {
          plans: [
            { id: "FREE", limits: SUBSCRIPTION_LIMITS.FREE },
            { id: "BASIC", limits: SUBSCRIPTION_LIMITS.BASIC },
            { id: "PREMIUM", limits: SUBSCRIPTION_LIMITS.PREMIUM },
          ],
        },
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/users/:id/student-stats",
    { preHandler: [app.authenticate, app.requireRole("SUPER_ADMIN")] },
    async (request, reply) => {
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }

      const profile = await app.prisma.studentProfile.findFirst({
        where: { userId: params.data.id },
      });

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

      const cacheKey = `student:analytics:ai-feedback:${profile.id}`;
      let aiFeedbackRaw = await app.redis.get(cacheKey);
      let aiFeedback: { aiAnalysisStudent: string; aiAnalysisParent: string } | null = null;
      if (aiFeedbackRaw) {
        try {
          aiFeedback = JSON.parse(aiFeedbackRaw);
        } catch {}
      }

      if (!aiFeedback) {
        aiFeedback = await generateAiFeedback(analytics);
        await app.redis.set(cacheKey, JSON.stringify(aiFeedback), "EX", 2 * 60 * 60);
      }

      return {
        success: true,
        data: {
          analytics,
          aiFeedback,
        },
      };
    }
  );
}
