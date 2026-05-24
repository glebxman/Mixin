import type { OnboardingInput } from "@edtech/types";
import { call } from "./http";

export type StudentMe = {
  id: string;
  userId: string;
  grade: string;
  age?: number | null;
  schoolName?: string | null;
  interests: string[];
  favoriteSubjects: string[];
  targetProfession?: string | null;
  careerDirection?: string | null;
  xp: number;
  level: number;
  streakDays: number;
  onboardingComplete: boolean;
};

export type SubjectScore = {
  subject: string;
  score: number;
  trend: "up" | "down" | "stable";
};

export type WeeklyActivity = { day: string; minutes: number };

export type Recommendation = {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

export type LearningPlanItem = {
  title: string;
  description: string;
  subject: string;
  priority: "high" | "medium" | "low";
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
  aiAnalysisStudent?: string | null;
  aiAnalysisParent?: string | null;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  estimatedTime: number;
  xpReward: number;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  progress?: number;
};

export type AiQuestQuestion = {
  type?: "choice" | "text" | "order" | "matchstick" | "logic";
  q: string;
  prompt?: string;
  options?: string[];
  correct?: number;
  answer?: string;
  explanation?: string;
};

export type CompleteAiQuestInput = {
  title: string;
  subject?: string;
  gradeBand?: string;
  totalQuestions: number;
  correctAnswers: number;
  answers?: Array<number | string>;
  questions?: AiQuestQuestion[];
};

export type CompleteQuestResult = {
  questId: string;
  score: number;
  xpEarned: number;
  totalXp: number;
};

export type ParentLinkCode = {
  code: string;
  expiresAt: string;
};

export const studentApi = {
  me: () => call<StudentMe>({ method: "GET", url: "/api/students/me" }),
  saveOnboarding: (input: OnboardingInput) =>
    call<StudentMe>({
      method: "POST",
      url: "/api/students/me/onboarding",
      data: input,
    }),
  analytics: () =>
    call<StudentAnalytics>({ method: "GET", url: "/api/students/me/analytics" }),
  quests: () => call<Quest[]>({ method: "GET", url: "/api/students/me/quests" }),
  parentLinkCode: () =>
    call<ParentLinkCode>({ method: "GET", url: "/api/students/me/parent-link-code" }),
  startQuest: (questId: string) =>
    call<Quest>({ method: "POST", url: `/api/quests/${questId}/start` }),
  completeQuest: (questId: string, payload: { score?: number }) =>
    call<CompleteQuestResult>({
      method: "POST",
      url: `/api/quests/${questId}/complete`,
      data: payload,
    }),
  completeAiQuest: (payload: CompleteAiQuestInput) =>
    call<CompleteQuestResult>({
      method: "POST",
      url: "/api/quests/ai/complete",
      data: payload,
    }),
};
