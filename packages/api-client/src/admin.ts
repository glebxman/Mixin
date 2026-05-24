import type { Role, SubscriptionPlan } from "@edtech/types";
import { call } from "./http";

export type AdminOverview = {
  totalUsers: number;
  activeSchools: number;
  aiRequestsToday: number;
  monthlyRevenue: number;
  growth: { users: string; schools: string; ai: string; revenue: string };
  serviceStatus: Array<{
    name: string;
    status: "online" | "offline" | "degraded";
    uptime: string;
  }>;
};

export type AdminUser = {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  subscriptionPlan: SubscriptionPlan;
  createdAt: string;
  profile: { firstName: string; lastName: string } | null;
};

export type AdminUsersPage = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminUsersQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: Role;
  plan?: SubscriptionPlan;
  isActive?: boolean;
};

export type AdminPlanInfo = {
  id: SubscriptionPlan;
  limits: {
    aiMessagesPerDay: number;
    dailyCredits: number;
    questsAllowed: boolean;
  };
};

function buildUsersParams(q: AdminUsersQuery): Record<string, string> {
  const params: Record<string, string> = {};
  if (q.page) params.page = String(q.page);
  if (q.pageSize) params.pageSize = String(q.pageSize);
  if (q.q && q.q.trim()) params.q = q.q.trim();
  if (q.role) params.role = q.role;
  if (q.plan) params.plan = q.plan;
  if (typeof q.isActive === "boolean") params.isActive = String(q.isActive);
  return params;
}

export const adminApi = {
  overview: () => call<AdminOverview>({ method: "GET", url: "/api/admin/overview" }),

  users: (query: AdminUsersQuery = {}) =>
    call<AdminUsersPage>({
      method: "GET",
      url: "/api/admin/users",
      params: buildUsersParams(query),
    }),

  plans: () => call<{ plans: AdminPlanInfo[] }>({ method: "GET", url: "/api/admin/plans" }),

  setUserActive: (id: string, isActive: boolean) =>
    call<AdminUser>({
      method: "PATCH",
      url: `/api/users/${id}`,
      data: { isActive },
    }),

  setUserPlan: (id: string, plan: SubscriptionPlan, reason?: string) =>
    call<AdminUser & { previousPlan: SubscriptionPlan; unchanged: boolean }>({
      method: "PATCH",
      url: `/api/admin/users/${id}/plan`,
      data: reason ? { plan, reason } : { plan },
    }),

  studentStats: (id: string) =>
    call<{ analytics: any; aiFeedback: { aiAnalysisStudent: string; aiAnalysisParent: string } }>({
      method: "GET",
      url: `/api/admin/users/${id}/student-stats`,
    }),
};
