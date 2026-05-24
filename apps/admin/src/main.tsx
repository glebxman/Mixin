import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  authApi,
  ROLE_URLS,
  setUnauthorizedHandler,
  STUDENT_URL,
} from "@edtech/api-client";
import { I18nProvider, useI18n } from "@edtech/i18n";
import { LanguageSwitcher } from "@edtech/i18n/LanguageSwitcher";
import { AppShell, AuthGuard, Brand, Spinner, cn, type NavItem } from "@edtech/ui";
import { HomeIcon, UsersIcon } from "@heroicons/react/24/outline";
import "./index.css";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const UsersPage = lazy(() =>
  import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

setUnauthorizedHandler(() => {
  window.location.href = `${STUDENT_URL}/login`;
});

function useAuthMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    retry: false,
  });
}

const NAV: ReadonlyArray<NavItem> = [
  { to: "/", labelKey: "nav.dashboard", icon: HomeIcon },
  { to: "/users", labelKey: "nav.users", icon: UsersIcon },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { data } = useAuthMe();

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    qc.clear();
    window.location.href = `${STUDENT_URL}/login`;
  }

  const userName = data?.profile
    ? `${data.profile.firstName} ${data.profile.lastName}`.trim()
    : t("panels.admin");

  return (
    <div className="min-h-screen bg-[#f4f5f6] text-neutral-900 font-sans antialiased">
      <div className="mx-auto px-4 pt-4 md:pt-6">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-3xl bg-[#161719] px-6 py-3 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.15)] border border-[#232529]">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e676] to-[#00b0ff] shadow-md shadow-emerald-500/20">
              <svg className="size-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white font-serif">
              mixin <span className="text-[#00e676]">admin</span>
            </span>
          </div>

          {/* Navigation links in middle */}
          <nav className="flex items-center gap-1.5 bg-[#232529]/60 p-1 rounded-full border border-white/5">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  "px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
                  isActive
                    ? "bg-[#00e676] text-black shadow-[0_4px_12px_rgba(0,230,118,0.3)] font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                )
              }
            >
              {t("nav.dashboard")}
            </NavLink>
            <NavLink
              to="/users"
              className={({ isActive }) =>
                cn(
                  "px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
                  isActive
                    ? "bg-[#00e676] text-black shadow-[0_4px_12px_rgba(0,230,118,0.3)] font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                )
              }
            >
              {t("nav.users")}
            </NavLink>
          </nav>

          {/* User profile & Lang switcher & Logout */}
          <div className="flex items-center gap-4">
            <div className="block">
              <LanguageSwitcher />
            </div>

            <div className="flex items-center gap-3 border-l border-neutral-800 pl-4">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-full bg-neutral-800 font-bold text-white text-xs border border-white/10 uppercase">
                  {userName.slice(0, 2)}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight">{userName}</div>
                  <div className="text-[10px] text-neutral-500 leading-none">{data?.email}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="group flex size-8 items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-[#00e676] transition-colors border border-transparent hover:border-neutral-700/50"
                title={t("auth.logout")}
              >
                <svg className="size-4.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>
      </div>

      <main className="mx-auto px-4 py-8">
        <div className="space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="text-neutral-700" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthGuard
        source={{ useUser: useAuthMe }}
        expectedRole="SUPER_ADMIN"
        resolveRedirect={(role) => ROLE_URLS[role]}
        loginUrl={`${STUDENT_URL}/login`}
      >
        <AdminShell>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route index element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AdminShell>
      </AuthGuard>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
