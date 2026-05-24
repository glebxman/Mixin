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
