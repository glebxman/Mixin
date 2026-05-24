

type Trend = "up" | "down" | "stable";
type Priority = "high" | "medium" | "low";

export type SubjectScore = { subject: string; score: number; trend: Trend };
export type WeeklyActivity = { day: string; minutes: number };
export type Recommendation = {
  title: string;
  description: string;
  priority: Priority;
};

export type LearningPlanItem = {
  title: string;
  description: string;
  subject: string;
  priority: Priority;
  minutesPerDay: number;
};

export type CareerInsight = {
  stage: "early" | "explore" | "focused";
  title: string;
  description: string;
  matchScore: number;
  requiredSubjects: string[];
  nextSteps: string[];
  universities: string[];
};

export type QuestStrategy = {
  format: string;
  focus: string;
  recommended: Array<{
    title: string;
    description: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    subject: string;
  }>;
};

export type IntegrationStatus = {
  name: string;
  status: "connected" | "planned" | "needs_setup";
  description: string;
};

export type AiModuleStatus = {
  name: string;
  status: "active" | "planned";
  description: string;
};

export type UniversityChance = {
  name: string;
  chance: "high" | "medium" | "low";
  score: number; // 0-100
  note: string;
};

export type StudentAnalytics = {
  overallProgress: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  streakDays: number;
  totalStudyTime: number;
  subjectScores: SubjectScore[];
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  weeklyActivity: WeeklyActivity[];
  completedQuests: number;
  totalQuests: number;
  profileSummary: {
    grade: string;
    age?: number | null;
    schoolName?: string | null;
    interests: string[];
    favoriteSubjects: string[];
    targetProfession?: string | null;
    careerDirection?: string | null;
  };
  careerInsight: CareerInsight;
  learningPlan: LearningPlanItem[];
  questStrategy: QuestStrategy;
  integrations: IntegrationStatus[];
  aiModules: AiModuleStatus[];
  universityChances: UniversityChance[];
  aiAnalysisStudent?: string | null;
  aiAnalysisParent?: string | null;
};

const WEEKDAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const DIRECTION_MAP = {
  it: {
    title: "IT и инженерия",
    subjects: ["Математика", "Информатика", "Физика", "Английский"],
    universities: [
      "TUIT (Tashkent University of IT)",
      "INHA University in Tashkent",
      "New Uzbekistan University",
      "Westminster International University (WIUT)",
      "Amity University Tashkent",
      "Turin Polytechnic University in Tashkent",
    ],
    quests: ["мини-проект", "алгоритмы", "логика"],
  },
  medicine: {
    title: "Медицина и биология",
    subjects: ["Биология", "Химия", "Математика", "Логика"],
    universities: [
      "Tashkent Medical Academy",
      "Tashkent Pediatric Medical Institute",
      "Samarkand State Medical University",
      "Bukhara State Medical Institute",
      "Tashkent Pharmaceutical Institute",
    ],
    quests: ["кейс пациента", "биология", "логика"],
  },
  economy: {
    title: "Экономика и бизнес",
    subjects: ["Математика", "Английский", "История", "Финансовая грамотность"],
    universities: [
      "University of World Economy and Diplomacy (UWED)",
      "Tashkent State University of Economics (TSUE)",
      "Westminster International University (WIUT)",
      "Management Development Institute of Singapore (MDIS) Tashkent",
      "Tashkent Institute of Finance",
    ],
    quests: ["бизнес-кейс", "финансы", "аналитика"],
  },
  law: {
    title: "Юриспруденция",
    subjects: ["История", "Родной язык", "Английский", "Обществознание"],
    universities: [
      "Tashkent State University of Law (TSUL)",
      "University of World Economy and Diplomacy (UWED)",
      "National University of Uzbekistan (NUUz)",
    ],
    quests: ["правовой кейс", "дебаты", "аналитика"],
  },
  education: {
    title: "Педагогика и языки",
    subjects: ["Родной язык", "Английский", "Литература", "Психология"],
    universities: [
      "Uzbekistan State World Languages University",
      "Nizami Tashkent State Pedagogical University",
      "Chirchik State Pedagogical University",
    ],
    quests: ["мини-урок", "презентация", "эссе"],
  },
  engineering: {
    title: "Инженерия и архитектура",
    subjects: ["Математика", "Физика", "Черчение", "Информатика"],
    universities: [
      "Turin Polytechnic University in Tashkent",
      "Tashkent State Technical University",
      "Tashkent Institute of Architecture and Civil Engineering",
      "Navoi State Mining and Technology University",
    ],
    quests: ["проектирование", "физика", "3D-модель"],
  },
  general: {
    title: "Исследование направлений",
    subjects: ["Математика", "Родной язык", "Английский", "Логика"],
    universities: [
      "National University of Uzbekistan (NUUz)",
      "New Uzbekistan University",
      "Tashkent State University of Economics (TSUE)",
      "TUIT (Tashkent University of IT)",
    ],
    quests: ["логика", "мини-проект", "самопрезентация"],
  },
} as const;

type SubjectProgressInput = {
  subject: { nameRu: string };
  score: number;
  weakTopics?: string[];
};

type AiSessionInput = {
  tokensUsed?: number;
  createdAt: Date;
};

type QuestProgressInput = {
  status: string;
};

export function buildStudentAnalytics(input: {
  studentProfile: {
    grade: string;
    age?: number | null;
    schoolName?: string | null;
    xp: number;
    level: number;
    streakDays: number;
    interests: string[];
    favoriteSubjects: string[];
    targetProfession?: string | null;
    careerDirection?: string | null;
  };
  subjectProgress: SubjectProgressInput[];
  aiSessions: AiSessionInput[];
  questProgress: QuestProgressInput[];
  totalQuests: number;
}): StudentAnalytics {
  const { studentProfile, subjectProgress, aiSessions, questProgress, totalQuests } = input;

  const subjectScores = buildSubjectScores(subjectProgress, studentProfile);
  const overallProgress =
    subjectScores.length === 0
      ? 0
      : Math.round(subjectScores.reduce((acc, item) => acc + item.score, 0) / subjectScores.length);
  // Estimate study time from tokensUsed instead of loading entire messages JSON
  const totalStudyTime = aiSessions.reduce((sum, session) => {
    const tokens = session.tokensUsed ?? 0;
    return sum + Math.max(2, Math.round(tokens / 500));
  }, 0);
  const weeklyActivity = computeWeeklyActivity(aiSessions);
  const completedQuests = questProgress.filter((q) => q.status === "COMPLETED").length;
  const weakSubjects = subjectScores.filter((s) => s.score < 70).sort((a, b) => a.score - b.score);
  const strongSubjects = subjectScores.filter((s) => s.score >= 80).sort((a, b) => b.score - a.score);
  const direction = resolveDirection(studentProfile);

  return {
    overallProgress,
    level: studentProfile.level,
    xp: studentProfile.xp,
    xpToNextLevel: xpToNextLevel(studentProfile.level, studentProfile.xp),
    streakDays: studentProfile.streakDays,
    totalStudyTime,
    subjectScores: subjectScores.slice(0, 8),
    strengths: buildStrengths(studentProfile, strongSubjects, direction),
    weaknesses: buildWeaknesses(weakSubjects, subjectProgress),
    recommendations: buildRecommendations(studentProfile, weakSubjects, direction),
    weeklyActivity,
    completedQuests,
    totalQuests: totalQuests || Math.max(12, subjectScores.length * 6),
    profileSummary: {
      grade: gradeLabel(studentProfile.grade),
      age: studentProfile.age,
      schoolName: studentProfile.schoolName,
      interests: studentProfile.interests,
      favoriteSubjects: studentProfile.favoriteSubjects,
      targetProfession: studentProfile.targetProfession,
      careerDirection: studentProfile.careerDirection,
    },
    careerInsight: buildCareerInsight(studentProfile, subjectScores, direction),
    learningPlan: buildLearningPlan(weakSubjects, direction),
    questStrategy: buildQuestStrategy(studentProfile, weakSubjects, direction),
    integrations: buildIntegrations(),
    aiModules: buildAiModules(),
    universityChances: buildUniversityChances(subjectScores, direction, studentProfile),
  };
}

function buildSubjectScores(
  subjectProgress: SubjectProgressInput[],
  studentProfile: { favoriteSubjects: string[]; careerDirection?: string | null; targetProfession?: string | null },
): SubjectScore[] {
  if (subjectProgress.length > 0) {
    return subjectProgress.map((p) => ({
      subject: p.subject.nameRu,
      score: Math.round(p.score),
      trend: scoreTrend(p.score),
    }));
  }

  const direction = resolveDirection(studentProfile);
  return direction.subjects.map((subject, index) => ({
    subject,
    score: Math.max(58, 78 - index * 4 + (studentProfile.favoriteSubjects.includes(subject) ? 8 : 0)),
    trend: index < 2 ? "up" : "stable",
  }));
}

function buildStrengths(
  profile: { interests: string[]; favoriteSubjects: string[] },
  strongSubjects: SubjectScore[],
  direction: (typeof DIRECTION_MAP)[keyof typeof DIRECTION_MAP],
): string[] {
  const result = strongSubjects.slice(0, 3).map((item) => `${item.subject}: сильный результат`);
  for (const subject of profile.favoriteSubjects.slice(0, 2)) result.push(`${subject}: высокий интерес`);
  for (const interest of profile.interests.slice(0, 2)) result.push(`${capitalize(interest)}: потенциал для проектов`);
  if (result.length === 0) result.push(`${direction.title}: можно начать с диагностических квестов`);
  return result.slice(0, 5);
}

function buildWeaknesses(weakSubjects: SubjectScore[], progress: SubjectProgressInput[]): string[] {
  const result = weakSubjects.slice(0, 4).map((item) => {
    const source = progress.find((p) => p.subject.nameRu === item.subject);
    const topicCount = source?.weakTopics?.length ?? 0;
    const topicHint = topicCount > 0 ? `, слабых тем: ${topicCount}` : "";
    return `${item.subject}: нужно подтянуть (${Math.round(item.score)}%${topicHint})`;
  });
  if (result.length === 0) result.push("Явных провалов нет, можно усиливать профильные предметы");
  return result.slice(0, 5);
}

function buildRecommendations(
  profile: { targetProfession?: string | null },
  weakSubjects: SubjectScore[],
  direction: (typeof DIRECTION_MAP)[keyof typeof DIRECTION_MAP],
): Recommendation[] {
  const result = weakSubjects.slice(0, 2).map<Recommendation>((subject) => ({
    title: `Подтянуть ${subject.subject.toLowerCase()}`,
    description: `30 минут в день: короткое объяснение, 5 задач и один AI-разбор ошибок. Сейчас ${Math.round(subject.score)}%.`,
    priority: subject.score < 60 ? "high" : "medium",
  }));

  result.push({
    title: profile.targetProfession
      ? `Готовить трек под цель: ${profile.targetProfession}`
      : `Проверить направление: ${direction.title}`,
    description: `Сделать упор на ${direction.subjects.slice(0, 3).join(", ")} и пройти профильный квест.`,
    priority: "medium",
  });



  return result.slice(0, 4);
}

function buildCareerInsight(
  profile: {
    grade: string;
    interests: string[];
    favoriteSubjects: string[];
    targetProfession?: string | null;
    careerDirection?: string | null;
  },
  subjectScores: SubjectScore[],
  direction: (typeof DIRECTION_MAP)[keyof typeof DIRECTION_MAP],
): CareerInsight {
  const gradeNumber = Number(profile.grade.replace("G", ""));
  const stage = gradeNumber < 7 ? "early" : profile.targetProfession || profile.careerDirection ? "focused" : "explore";
  const required = direction.subjects;
  const relevantScores = subjectScores.filter((s) => required.some((r) => sameSubject(r, s.subject)));
  const scorePart =
    relevantScores.length > 0
      ? relevantScores.reduce((sum, item) => sum + item.score, 0) / relevantScores.length
      : 65;
  const interestPart =
    profile.interests.length + profile.favoriteSubjects.length > 0 ? 12 : 0;
  const matchScore = Math.min(96, Math.round(scorePart + interestPart));

  if (stage === "early") {
    return {
      stage,
      title: "Раннее развитие интересов",
      description: "Для младших классов система не давит выбором профессии: важнее интерес, базовые навыки и игровые квесты.",
      matchScore,
      requiredSubjects: required,
      nextSteps: ["Игровые задания", "Развитие логики", "Чтение и базовая математика"],
      universities: [],
    };
  }

  return {
    stage,
    title: profile.targetProfession || direction.title,
    description:
      stage === "focused"
        ? "Платформа усиливает предметы, нужные для выбранного направления, и связывает квесты с поступлением."
        : "ИИ анализирует интересы и успеваемость, чтобы предложить несколько направлений для проверки.",
    matchScore,
    requiredSubjects: required,
    nextSteps: [
      `Диагностика по предметам: ${required.slice(0, 2).join(", ")}`,
      "Профильный квест с реальной задачей",
      "План подготовки к экзаменам",
    ],
    universities: direction.universities,
  };
}

function buildLearningPlan(
  weakSubjects: SubjectScore[],
  direction: (typeof DIRECTION_MAP)[keyof typeof DIRECTION_MAP],
): LearningPlanItem[] {
  const plan = weakSubjects.slice(0, 3).map<LearningPlanItem>((subject) => ({
    title: `Закрыть пробелы: ${subject.subject}`,
    description: "AI объяснение, визуальная схема, практика и повторная проверка через 48 часов.",
    subject: subject.subject,
    priority: subject.score < 60 ? "high" : "medium",
    minutesPerDay: subject.score < 60 ? 35 : 25,
  }));

  plan.push({
    title: `Профильный фокус: ${direction.title}`,
    description: `Поддерживать темп по предметам: ${direction.subjects.join(", ")}.`,
    subject: direction.subjects[0],
    priority: "medium",
    minutesPerDay: 20,
  });

  return plan.slice(0, 4);
}

function buildQuestStrategy(
  profile: { grade: string },
  weakSubjects: SubjectScore[],
  direction: (typeof DIRECTION_MAP)[keyof typeof DIRECTION_MAP],
): QuestStrategy {
  const gradeNumber = Number(profile.grade.replace("G", ""));
  const subject = weakSubjects[0]?.subject || direction.subjects[0];

  if (gradeNumber <= 6) {
    return {
      format: "Игровые задания",
      focus: "Интерес, базовые навыки и уверенность",
      recommended: [
        {
          title: `Игра-квест по теме: ${subject}`,
          description: "Короткие интерактивные задания с подсказками и визуализацией.",
          difficulty: "EASY",
          subject,
        },
      ],
    };
  }

  if (gradeNumber <= 9) {
    return {
      format: "Логические задачи и мини-проекты",
      focus: `Проверить направление через ${direction.quests.join(", ")}`,
      recommended: [
        {
          title: `Мини-проект: ${direction.title}`,
          description: "Практическая задача на 30-45 минут с AI-разбором результата.",
          difficulty: "MEDIUM",
          subject,
        },
      ],
    };
  }

  return {
    format: "Профильные симуляции и подготовка к экзаменам",
    focus: "Поступление, экзамены и реальные задачи профессии",
    recommended: [
      {
        title: `Симуляция: ${direction.title}`,
        description: "Кейс уровня старших классов с оценкой навыков и рекомендациями для поступления.",
        difficulty: "HARD",
        subject,
      },
    ],
  };
}

function buildIntegrations(): IntegrationStatus[] {
  return [
    {
      name: "Учебники Узбекистана",
      status: "planned",
      description: "База материалов используется для объяснений, тем и персональных заданий.",
    },
  ];
}

function buildAiModules(): AiModuleStatus[] {
  return [
    {
      name: "Текстовый наставник",
      status: "active",
      description: "Объясняет темы, задаёт уточняющие вопросы и ведёт диалог.",
    },
    {
      name: "Визуализация и схемы",
      status: "active",
      description: "Готовит изображения, схемы и структурные объяснения сложных тем.",
    },
    {
      name: "Видео и интерактив",
      status: "planned",
      description: "Следующий слой для коротких видео и интерактивных симуляций.",
    },
  ];
}

function buildUniversityChances(
  subjectScores: SubjectScore[],
  direction: (typeof DIRECTION_MAP)[keyof typeof DIRECTION_MAP],
  profile: { interests: string[]; favoriteSubjects: string[] },
): UniversityChance[] {
  const required = direction.subjects;
  const relevantScores = subjectScores.filter((s) =>
    required.some((r) => sameSubject(r, s.subject)),
  );
  const avgScore =
    relevantScores.length > 0
      ? relevantScores.reduce((sum, item) => sum + item.score, 0) / relevantScores.length
      : 60;
  const interestBonus = profile.interests.length + profile.favoriteSubjects.length > 2 ? 5 : 0;

  // Each university has a difficulty tier (higher = harder to get in)
  const difficultyTiers: Record<string, number> = {
    "Westminster International University (WIUT)": 88,
    "INHA University in Tashkent": 85,
    "Turin Polytechnic University in Tashkent": 82,
    "Amity University Tashkent": 75,
    "University of World Economy and Diplomacy (UWED)": 84,
    "Management Development Institute of Singapore (MDIS) Tashkent": 78,
    "Tashkent Medical Academy": 86,
    "Tashkent State University of Law (TSUL)": 82,
    "National University of Uzbekistan (NUUz)": 76,
    "New Uzbekistan University": 74,
    "TUIT (Tashkent University of IT)": 72,
    "Tashkent State University of Economics (TSUE)": 73,
    "Tashkent State Technical University": 70,
    "Nizami Tashkent State Pedagogical University": 65,
    "Uzbekistan State World Languages University": 68,
    "Tashkent Pediatric Medical Institute": 80,
    "Samarkand State Medical University": 78,
    "Bukhara State Medical Institute": 75,
    "Tashkent Pharmaceutical Institute": 74,
    "Tashkent Institute of Finance": 72,
    "Tashkent Institute of Architecture and Civil Engineering": 70,
    "Navoi State Mining and Technology University": 65,
    "Chirchik State Pedagogical University": 62,
  };

  return direction.universities.map((uni) => {
    const threshold = difficultyTiers[uni] ?? 70;
    const studentScore = Math.min(100, Math.round(avgScore + interestBonus));
    const gap = studentScore - threshold;

    let chance: "high" | "medium" | "low";
    let note: string;

    if (gap >= 8) {
      chance = "high";
      note = `Текущая успеваемость (${studentScore}%) выше проходного уровня. Продолжай в том же темпе.`;
    } else if (gap >= -5) {
      chance = "medium";
      note = `Шансы хорошие, но нужно подтянуть ${required.slice(0, 2).join(" и ")} на 5–10%.`;
    } else {
      chance = "low";
      note = `Нужно серьёзно подтянуть ${required.slice(0, 2).join(" и ")}. Сейчас ${studentScore}%, нужно ~${threshold}%.`;
    }

    return { name: uni, chance, score: studentScore, note };
  });
}

function resolveDirection(profile: {
  careerDirection?: string | null;
  targetProfession?: string | null;
  interests?: string[];
  favoriteSubjects?: string[];
}) {
  const text = [
    profile.careerDirection,
    profile.targetProfession,
    ...(profile.interests ?? []),
    ...(profile.favoriteSubjects ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(it|айти|програм|информ|код|software|computer|dastur)/i.test(text)) return DIRECTION_MAP.it;
  if (/(мед|врач|биолог|хим|medicine|doctor|tibbiyot|farmac)/i.test(text)) return DIRECTION_MAP.medicine;
  if (/(эконом|business|бизнес|финанс|маркет|менедж|iqtisod)/i.test(text)) return DIRECTION_MAP.economy;
  if (/(юрис|право|law|huquq|адвокат)/i.test(text)) return DIRECTION_MAP.law;
  if (/(педагог|учитель|язык|лингв|teacher|education|til)/i.test(text)) return DIRECTION_MAP.education;
  if (/(инженер|архитект|строит|engineer|muhandis|техн)/i.test(text)) return DIRECTION_MAP.engineering;
  return DIRECTION_MAP.general;
}

function scoreTrend(score: number): Trend {
  if (score >= 85) return "up";
  if (score < 65) return "down";
  return "stable";
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function computeWeeklyActivity(sessions: AiSessionInput[]): WeeklyActivity[] {
  const now = new Date();
  const result: WeeklyActivity[] = [];

  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const label = WEEKDAY_LABELS[day.getDay()];

    const minutes = sessions.reduce((sum, session) => {
      const created = new Date(session.createdAt);
      if (
        created.getFullYear() === day.getFullYear() &&
        created.getMonth() === day.getMonth() &&
        created.getDate() === day.getDate()
      ) {
        // Estimate: each session ~7 minutes base + tokens-based time
        const tokens = session.tokensUsed ?? 0;
        return sum + 5 + Math.round(tokens / 500);
      }
      return sum;
    }, 0);

    result.push({ day: label, minutes });
  }

  return result;
}

function xpToNextLevel(level: number, xp: number): number {
  const required = 500 + (level - 1) * 100;
  return Math.max(50, required - (xp % required));
}

function gradeLabel(grade: string): string {
  const number = grade.replace("G", "");
  return `${number} класс`;
}

function sameSubject(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return left.includes(right) || right.includes(left);
}

export async function generateAiFeedback(analytics: any): Promise<{
  aiAnalysisStudent: string;
  aiAnalysisParent: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const defaultModel = process.env.OPENROUTER_MODEL || "meta-llama/llama-4-maverick";

  if (!apiKey) {
    return {
      aiAnalysisStudent: "ИИ-анализ временно недоступен. Заполните профиль и пройдите больше квестов, чтобы получить рекомендации.",
      aiAnalysisParent: "ИИ-анализ временно недоступен. Пожалуйста, убедитесь, что ваш ребенок активно занимается на платформе.",
    };
  }

  const prompt = `
Вы — опытный ИИ-тьютор и профориентатор платформы Mixin.uz.
Вам предоставлены данные об успеваемости ученика:
- Класс: ${analytics.profileSummary.grade}
- Возраст: ${analytics.profileSummary.age || "не указан"}
- Интересы: ${analytics.profileSummary.interests.join(", ") || "не указаны"}
- Любимые предметы: ${analytics.profileSummary.favoriteSubjects.join(", ") || "не указаны"}
- Желаемая профессия: ${analytics.profileSummary.targetProfession || "не указана"}
- Направление карьеры: ${analytics.profileSummary.careerDirection || "не указано"}
- Ориентировочные вузы для этого направления: ${analytics.careerInsight.universities.join(", ") || "TUIT, INHA, WIUT, New Uzbekistan University, National University of Uzbekistan, Tashkent Medical Academy"}
- Успеваемость по предметам (в %):
${analytics.subjectScores.map((s: any) => `  * ${s.subject}: ${s.score}% (тренд: ${s.trend})`).join("\n")}
- Сильные стороны:
${analytics.strengths.map((s: string) => `  * ${s}`).join("\n")}
- Слабые стороны:
${analytics.weaknesses.map((w: string) => `  * ${w}`).join("\n")}
- Прогресс выполнения квестов: ${analytics.completedQuests} из ${analytics.totalQuests}

Сформируйте два развернутых анализа на русском языке. Ответ предоставьте строго в формате JSON:
{
  "aiAnalysisStudent": "Текст анализа для ученика...",
  "aiAnalysisParent": "Текст анализа для родителя..."
}

Требования к тексту для ученика (aiAnalysisStudent):
- Обращайтесь на "ты", дружелюбно, мотивирующе, вдохновляюще.
- Оцените его сильные стороны и объясните, как они помогут ему в достижении его цели (${analytics.profileSummary.targetProfession || "выбранного направления"}).
- Дайте конкретную и понятную оценку шансов на поступление в целевые вузы (в какие университеты из списка шансов поступить больше всего при текущих оценках, а в какие пройти сложнее).
- Дайте конкретные, практичные советы (какие темы подтянуть, какие квесты пройти) без общих фраз.
- Держите объем около 150-250 слов, отформатируйте переносами строк для красивого чтения.

Требования к тексту для родителя (aiAnalysisParent):
- Обращайтесь уважительно, на "вы".
- Дайте объективную картину: в чем ребенок молодец, а где ему нужна поддержка и контроль.
- Дайте конкретные рекомендации родителю, как поддержать ребенка дома (например, хвалить за успехи в математике, помочь организовать время для информатики).
- Объясните простым языком, подходит ли выбранное ребенком карьерное направление (${analytics.profileSummary.targetProfession || "его интересам"}) текущей успеваемости.
- Оцените шансы поступления ребенка в вузы на основе его текущих оценок (в какие вузы шансы выше, а куда поступить будет сложно без дополнительного контроля и усилий).
- Держите объем около 150-250 слов, отформатируйте переносами строк для красивого чтения.

Верните ТОЛЬКО валидный JSON без какого-либо разметки markdown (без \`\`\`json).
`;

  const modelsToTry = [
    defaultModel,
    "minimax/minimax-m2.5:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ];

  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      console.log(`[generateAiFeedback] Attempting generation with ${currentModel}...`);
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://mixin.uz",
          "X-Title": "Mixin EdTech UZ",
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter responded with ${response.status} using ${currentModel}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || "";
      
      let parsed: any = null;
      try {
        parsed = JSON.parse(content);
      } catch {
        const cleanedStr = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        try {
          parsed = JSON.parse(cleanedStr);
        } catch {
          const startIdx = content.indexOf("{");
          const endIdx = content.lastIndexOf("}");
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            try {
              parsed = JSON.parse(content.substring(startIdx, endIdx + 1));
            } catch (err) {
              throw new Error(`Failed to parse extracted JSON block: ${(err as Error).message}`);
            }
          } else {
            throw new Error("No valid JSON structure found in content");
          }
        }
      }

      const studentAnalysis = parsed.aiAnalysisStudent || parsed.studentAnalysis || parsed.ai_analysis_student || parsed.student;
      const parentAnalysis = parsed.aiAnalysisParent || parsed.parentAnalysis || parsed.ai_analysis_parent || parsed.parent;

      if (studentAnalysis && parentAnalysis) {
        console.log(`[generateAiFeedback] Successfully generated AI feedback with ${currentModel}`);
        return {
          aiAnalysisStudent: studentAnalysis,
          aiAnalysisParent: parentAnalysis,
        };
      }
      throw new Error(`Missing expected student or parent feedback keys in returned JSON from ${currentModel}`);
    } catch (error) {
      lastError = error;
      console.warn(`[generateAiFeedback] Model ${currentModel} failed:`, error);
    }
  }

  console.error("All models exhausted in generateAiFeedback. Last error:", lastError);
  return {
    aiAnalysisStudent: "Произошла ошибка при генерации анализа ИИ. Попробуйте обновить страницу.",
    aiAnalysisParent: "Произошла ошибка при генерации анализа ИИ для родителей. Попробуйте обновить страницу.",
  };
}
