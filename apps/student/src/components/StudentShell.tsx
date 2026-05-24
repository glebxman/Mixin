import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@edtech/api-client";
import { Brand, ScrollArea, TopNav } from "@edtech/ui";
import { useI18n } from "@edtech/i18n";
import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { clearChatsStorage } from "@/hooks/useChats";

const NAV = [
  { to: "/", labelKey: "nav.chat", icon: ChatBubbleLeftRightIcon, end: true },
  { to: "/analytics", labelKey: "nav.analytics", icon: ChartBarIcon },
  { to: "/profile", labelKey: "nav.profile", icon: UserCircleIcon },
] as const;

/**
 * StudentShell — layout для не-чатовых страниц студента (analytics/profile).
 * Чат держит свой собственный sidebar в стиле ChatGPT (см. ChatSidebar).
 */
export function StudentShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    retry: false,
  });

  const userName = user?.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
    : t("panels.student");

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearChatsStorage();
    queryClient.clear();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#f4f5f6] p-3">
      <TopNav
        brand={<Brand variant="emerald" label="Mixin" />}
        panelLabel={t("panels.student")}
        user={{ name: userName, sub: user?.email }}
        onLogout={handleLogout}
        LinkComponent={Link}
      />
      <div className="mx-auto mt-3 flex max-w-7xl gap-3">
        <aside className="hidden w-64 shrink-0 rounded-[30px] border border-white/70 bg-[#ffffff] p-3  lg:block">
          <ScrollArea className="sticky top-6 max-h-[calc(100vh-3rem)] space-y-2 pr-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : undefined}
                className={({ isActive }) =>
                  `flex h-11 items-center gap-2.5 rounded-full px-4 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-neutral-950 text-white "
                      : "text-neutral-600 hover:bg-white hover:text-neutral-900"
                  }`
                }
              >
                <item.icon className="size-4" />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </ScrollArea>
        </aside>
        <main
          key={location.pathname}
          className="student-shell-main animate-fade-in-up min-w-0 flex-1 space-y-6 rounded-[30px] border border-neutral-200/60 bg-[#f8f9fa] p-6 "
        >
          {children}
        </main>
      </div>
    </div>
  );
}
