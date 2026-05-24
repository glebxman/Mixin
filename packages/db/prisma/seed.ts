/**
 * Seed для базовых сущностей: предметы, темы, квесты, демо-пользователи.
 * Запуск: pnpm --filter @edtech/db seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUBJECTS: Array<{
  slug: string;
  nameRu: string;
  nameUz: string;
  icon: string;
}> = [
  { slug: "math", nameRu: "Математика", nameUz: "Matematika", icon: "📐" },
  { slug: "physics", nameRu: "Физика", nameUz: "Fizika", icon: "⚛️" },
  { slug: "informatics", nameRu: "Информатика", nameUz: "Informatika", icon: "💻" },
  { slug: "chemistry", nameRu: "Химия", nameUz: "Kimyo", icon: "🧪" },
  { slug: "biology", nameRu: "Биология", nameUz: "Biologiya", icon: "🧬" },
  { slug: "history", nameRu: "История", nameUz: "Tarix", icon: "📜" },
  { slug: "geography", nameRu: "География", nameUz: "Geografiya", icon: "🌍" },
  { slug: "literature", nameRu: "Литература", nameUz: "Adabiyot", icon: "📚" },
  { slug: "english", nameRu: "Английский", nameUz: "Ingliz tili", icon: "🇬🇧" },
  { slug: "uzbek", nameRu: "Узбекский язык", nameUz: "O'zbek tili", icon: "🇺🇿" },
];

async function main() {
  console.log("🌱 Seeding subjects...");
  const subjects = await Promise.all(
    SUBJECTS.map((s) =>
      prisma.subject.upsert({
        where: { slug: s.slug },
        create: s,
        update: { nameRu: s.nameRu, nameUz: s.nameUz, icon: s.icon },
      }),
    ),
  );
  console.log(`  ✓ ${subjects.length} subjects ready`);

  console.log("🌱 Seeding topics & quests...");
  for (const subject of subjects) {
    for (let g = 5; g <= 11; g++) {
      const grade = `G${g}` as const;
      const topic = await prisma.topic.upsert({
        where: { id: `${subject.slug}-${grade}-intro` },
        create: {
          id: `${subject.slug}-${grade}-intro`,
          subjectId: subject.id,
          nameRu: `${subject.nameRu} — введение`,
          nameUz: `${subject.nameUz} — kirish`,
          grade,
          order: 1,
        },
        update: {},
      });

      await prisma.quest.upsert({
        where: { id: `${subject.slug}-${grade}-quest1` },
        create: {
          id: `${subject.slug}-${grade}-quest1`,
          topicId: topic.id,
          grade,
          nameRu: `Стартовый квест по предмету "${subject.nameRu}"`,
          nameUz: `${subject.nameUz} bo'yicha boshlovchi vazifa`,
          description:
            "Базовая проверка знаний по теме. Ответьте на 5 вопросов и получите XP.",
          difficulty: g <= 6 ? "EASY" : g <= 9 ? "MEDIUM" : "HARD",
          xpReward: g <= 6 ? 25 : g <= 9 ? 50 : 100,
          timeLimit: 25,
          content: {
            type: "quiz",
            questions: [],
          },
        },
        update: {},
      });
    }
  }
  console.log("  ✓ topics & starter quests ready");

  console.log("🌱 Seeding achievements...");
  const achievements: Array<{ slug: string; nameRu: string; nameUz: string; description: string; icon: string; xpBonus: number }> = [
    { slug: "first-quest", nameRu: "Первый квест", nameUz: "Birinchi vazifa", description: "Завершён первый образовательный квест", icon: "🥇", xpBonus: 25 },
    { slug: "streak-7", nameRu: "Серия 7 дней", nameUz: "7 kunlik seriya", description: "Занимаешься 7 дней подряд", icon: "🔥", xpBonus: 50 },
    { slug: "streak-30", nameRu: "Серия 30 дней", nameUz: "30 kunlik seriya", description: "Месяц непрерывных занятий", icon: "🏆", xpBonus: 200 },
  ];
  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      create: a,
      update: a,
    });
  }
  console.log(`  ✓ ${achievements.length} achievements ready`);

  console.log("🌱 Seeding demo users...");

  const demoPasswordHash = await bcrypt.hash("password123", 12);

  // Демо-ученик
  const studentUser = await prisma.user.upsert({
    where: { email: "student@demo.uz" },
    create: {
      email: "student@demo.uz",
      passwordHash: demoPasswordHash,
      role: "STUDENT",
      profile: { create: { firstName: "Алишер", lastName: "Демо", language: "ru" } },
      studentProfile: {
        create: {
          grade: "G9",
          age: 15,
          schoolName: "Школа №15 им. А. Навои",
          interests: ["программирование", "математика"],
          favoriteSubjects: ["информатика", "математика"],
          careerDirection: "IT / Программирование",
          xp: 250,
          level: 2,
          streakDays: 3,
          lastActiveAt: new Date(),
          onboardingComplete: true,
        },
      },
    },
    update: {},
    include: { studentProfile: true },
  });

  // Демо-родитель, привязанный к ученику
  const parentUser = await prisma.user.upsert({
    where: { email: "parent@demo.uz" },
    create: {
      email: "parent@demo.uz",
      passwordHash: demoPasswordHash,
      role: "PARENT",
      profile: { create: { firstName: "Нигора", lastName: "Демо", language: "ru" } },
      parentProfile: { create: {} },
    },
    update: {},
    include: { parentProfile: true },
  });

  if (parentUser.parentProfile && studentUser.studentProfile) {
    await prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: {
          parentId: parentUser.parentProfile.id,
          studentId: studentUser.studentProfile.id,
        },
      },
      create: {
        parentId: parentUser.parentProfile.id,
        studentId: studentUser.studentProfile.id,
      },
      update: {},
    });
  }

  // Demo school admin removed

  // Демо-супер-админ
  await prisma.user.upsert({
    where: { email: "admin@demo.uz" },
    create: {
      email: "admin@demo.uz",
      passwordHash: demoPasswordHash,
      role: "SUPER_ADMIN",
      profile: { create: { firstName: "Платформа", lastName: "Админ", language: "ru" } },
    },
    update: {},
  });

  // Демо-успеваемость для студента
  if (studentUser.studentProfile) {
    const studentId = studentUser.studentProfile.id;
    const seedScores: Record<string, number> = {
      math: 85,
      physics: 72,
      informatics: 92,
      chemistry: 65,
      biology: 78,
      history: 70,
      geography: 68,
      literature: 80,
    };
    for (const subject of subjects) {
      const score = seedScores[subject.slug] ?? 70;
      await prisma.subjectProgress.upsert({
        where: {
          studentId_subjectId: { studentId, subjectId: subject.id },
        },
        create: {
          studentId,
          subjectId: subject.id,
          score,
          weakTopics: [],
          lastSyncedAt: new Date(),
        },
        update: { score },
      });
    }
  }

  console.log("  ✓ demo accounts:");
  console.log("     STUDENT      → student@demo.uz / password123");
  console.log("     PARENT       → parent@demo.uz  / password123");
  console.log("     SUPER_ADMIN  → admin@demo.uz   / password123");
  console.log("✅ Seed complete");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
