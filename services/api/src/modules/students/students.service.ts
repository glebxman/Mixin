import type { PrismaClient } from "@edtech/db";

export async function findStudentByUserId(prisma: PrismaClient, userId: string) {
  return prisma.studentProfile.findUnique({ where: { userId } });
}

export async function getOrCreateStudentProfile(prisma: PrismaClient, userId: string) {
  const existing = await prisma.studentProfile.findUnique({ where: { userId } });
  if (existing) return existing;

  // Если пользователь зашёл как STUDENT, но профиля нет — создаём с дефолтным
  // классом (G7). Реальное значение придёт через onboarding.
  return prisma.studentProfile.create({
    data: {
      userId,
      grade: "G7",
      interests: [],
      favoriteSubjects: [],
    },
  });
}


import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Loads the StudentProfile for the authenticated user. If absent, sends a
 * standard 404 reply and returns null so callers can `return` immediately.
 *
 * Usage:
 *   const student = await requireStudent(app, request, reply);
 *   if (!student) return;
 *   // ...use student here
 *
 * Replaces the {findStudentByUserId + 404 send} duplication that was
 * present in students/quests/progress/ai routes.
 */
export async function requireStudent(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const profile = await findStudentByUserId(app.prisma, request.authUser!.userId);
  if (!profile) {
    reply.status(404).send({ success: false, error: "Student profile not found" });
    return null;
  }
  return profile;
}
