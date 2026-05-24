import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { authApi, setUnauthorizedHandler } from "@edtech/api-client";
import { I18nProvider } from "@edtech/i18n";
import { Spinner } from "@edtech/ui";
import { StudentAuthGate } from "@/components/StudentAuthGate";
import { StudentShell } from "@/components/StudentShell";
import { applyStoredTheme } from "@/lib/theme";
import "./index.css";

const ChatPage = lazy(() =>
  import("./pages/ChatPage").then((m) => ({ default: m.ChatPage })),
);
const AuthPage = lazy(() =>
  import("./pages/AuthPage").then((m) => ({ default: m.AuthPage })),
);
const AnalyticsPage = lazy(() =>
  import("./pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })),
);
// Init theme before first render to avoid FOUC
applyStoredTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

setUnauthorizedHandler(() => {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path !== "/login" && path !== "/register") {
    window.location.href = `/login?from=${encodeURIComponent(path)}`;
  }
});

import { useI18n } from "@edtech/i18n";

function ChatRoute() {
  const { t } = useI18n();
  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    retry: false,
  });
  const userName = user?.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
    : t("common.studentFallback");
  return <ChatPage userName={userName} userEmail={user?.email} />;
}

function ShellRoute({ children }: { children: React.ReactNode }) {
  return (
    <StudentAuthGate>
      <StudentShell>{children}</StudentShell>
    </StudentAuthGate>
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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route
            index
            element={
              <StudentAuthGate>
                <ChatRoute />
              </StudentAuthGate>
            }
          />
          <Route
            path="/analytics"
            element={
              <ShellRoute>
                <AnalyticsPage />
              </ShellRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
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
