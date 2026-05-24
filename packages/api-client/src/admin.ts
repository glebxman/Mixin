import type { Role } from "@edtech/types";
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
  createdAt: string;
  profile: { firstName: string; lastName: string } | null;
};

export const adminApi = {
  overview: () => call<AdminOverview>({ method: "GET", url: "/api/admin/overview" }),
  users: () => call<AdminUser[]>({ method: "GET", url: "/api/admin/users" }),
  setUserActive: (id: string, isActive: boolean) =>
    call<AdminUser>({
      method: "PATCH",
      url: `/api/users/${id}`,
      data: { isActive },
    }),
};
