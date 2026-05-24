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
import { AuthGuard, ScrollArea, Spinner } from "@edtech/ui";
import {
  ArrowRightOnRectangleIcon,
  HomeIcon,
  LightBulbIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import logoBlack from "./assets/logo_black.svg";
import "./index.css";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const ChildPage = lazy(() =>
  import("./pages/ChildPage").then((m) => ({ default: m.ChildPage })),
);
const RecommendationsPage = lazy(() =>
  import("./pages/RecommendationsPage").then((m) => ({
    default: m.RecommendationsPage,
  })),
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

const NAV = [
  { to: "/", labelKey: "nav.dashboard", icon: HomeIcon, end: true },
  { to: "/recommendations", labelKey: "nav.recommendations", icon: LightBulbIcon },
] as const;

function ParentShell({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const location = useLocation();
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
    : t("panels.parent");

  const user = data ? { name: userName, sub: data.email ?? null } : null;
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-screen overflow-hidden bg-[#f0f0ed] p-3">
      <header className="mx-auto w-full max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[34px] border border-[#d9d9d1] bg-[#3d3e3a] p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="inline-flex h-14 items-center gap-3 rounded-[26px] bg-[#eeeee5] px-5 text-[#151614] transition hover:bg-white"
          >
            <img src={logoBlack} alt="Mixin" className="size-6" />
            <span className="font-serif text-xl font-semibold leading-none tracking-tight">
              mixin <span className="text-sm text-[#089567]">parent</span>
            </span>
          </Link>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <span className="hidden h-10 items-center rounded-full bg-[#f2f2ec] px-4 text-sm font-medium text-[#555651] sm:inline-flex">
              {t("panels.parent")}
            </span>
            {user && (
              <div className="inline-flex h-12 items-center gap-3 rounded-full bg-[#f2f2ec] px-3 pr-5 text-[#151614]">
                <span className="grid size-8 place-items-center rounded-full bg-[#627fff] text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-semibold leading-tight">{user.name}</span>
                  {user.sub && (
                    <span className="block text-xs leading-tight text-[#6f7069]">
                      {user.sub}
                    </span>
                  )}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f2f2ec] px-5 text-sm font-medium text-[#555651] transition hover:bg-white hover:text-[#151614]"
            >
              <ArrowRightOnRectangleIcon className="size-4" />
              <span className="hidden sm:inline">{t("common.logout")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-3 flex h-[calc(100vh-7.25rem)] w-full max-w-[calc(100vw-1.5rem)] gap-3 overflow-hidden">
        <aside className="hidden h-full w-64 shrink-0 overflow-hidden rounded-[34px] border border-[#d9d9d1] bg-[#eeeee5] lg:block">
          <div className="bg-[#3d3e3a] p-4">
            <div className="inline-flex h-14 items-center gap-3 rounded-[24px] bg-[#eeeee5] px-5 text-lg font-semibold text-[#151614]">
              <SparklesIcon className="size-5" />
              {t("nav.dashboard")}
            </div>
          </div>
          <ScrollArea className="h-[calc(100%-5.75rem)] space-y-2 p-4">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : undefined}
                className={({ isActive }) =>
                  `flex h-12 items-center gap-3 rounded-full px-5 text-sm font-semibold transition-colors duration-150 ${
                    isActive
                      ? "bg-white text-[#151614] shadow-[0_12px_26px_rgba(37,38,34,0.06)]"
                      : "text-[#555651] hover:bg-[#f7f7f1] hover:text-[#151614]"
                  }`
                }
              >
                <item.icon className="size-4 shrink-0" />
                {t(item.labelKey)}
              </NavLink>
            ))}
            <div className="pt-3">
              <LanguageSwitcher />
            </div>
          </ScrollArea>
        </aside>
        <main
          key={location.pathname}
          className="parent-shell-main no-scrollbar animate-fade-in-up min-w-0 flex-1 space-y-6 overflow-y-auto"
        >
          {children}
        </main>
      </div>
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
    <BrowserRouter basename={import.meta.env.VITE_BASE_PATH_PARENT || "/"}>
      <AuthGuard
        source={{ useUser: useAuthMe }}
        expectedRole="PARENT"
        resolveRedirect={(role) => ROLE_URLS[role]}
        loginUrl={`${STUDENT_URL}/login`}
      >
        <ParentShell>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route index element={<DashboardPage />} />
              <Route path="/child/:id" element={<ChildPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ParentShell>
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
