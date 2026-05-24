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
import { AppShell, AuthGuard, Brand, Spinner, type NavItem } from "@edtech/ui";
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
    : t("panels.admin");

  const user = data ? { name: userName, sub: data.email ?? null } : null;

  return (
    <AppShell
      brand={<Brand variant="neutral" label="Mixin Admin" />}
      panelLabel={t("panels.admin")}
      nav={NAV}
      user={user}
      onLogout={handleLogout}
      LinkComponent={Link}
      NavLinkComponent={NavLink}
      LanguageSwitcher={LanguageSwitcher}
      translateLabel={t}
      density="compact"
      pathname={location.pathname}
    >
      {children}
    </AppShell>
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
