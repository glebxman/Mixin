import { call } from "./http";
import type { Recommendation, StudentAnalytics } from "./student";

export type ParentChild = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  grade: string;
  schoolName?: string | null;
  xp: number;
  level: number;
  streakDays: number;
};

export type ParentChildOverview = {
  child: ParentChild;
  analytics: StudentAnalytics;
};

export const parentApi = {
  children: () => call<ParentChild[]>({ method: "GET", url: "/api/parent/children" }),
  linkChild: (code: string) =>
    call<ParentChild>({
      method: "POST",
      url: "/api/parent/children/link",
      data: { code },
    }),
  childOverview: (id: string) =>
    call<ParentChildOverview>({
      method: "GET",
      url: `/api/parent/children/${id}`,
    }),
  recommendations: () =>
    call<{ category: string; items: Recommendation[] }[]>({
      method: "GET",
      url: "/api/parent/recommendations",
    }),
};
