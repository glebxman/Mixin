import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi, ROLE_URLS } from "@edtech/api-client";
import { useI18n } from "@edtech/i18n";
import { Spinner } from "@edtech/ui";

/**
 * Student-specific auth gate.
 *
 * Behaves like the shared `<AuthGuard>` from `@edtech/ui` for the role-mismatch
 * and happy paths, but on missing/errored sessions performs an in-app
 * `navigate("/login?from=...")` instead of the shared guard's full-page
 * `window.location.href = loginUrl` redirect. This preserves the student SPA's
 * existing UX where login is a route, not a separate sub-domain.
 */
export function StudentAuthGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { data, isLoading, error } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isLoading) return;
    if (error || !data) {
      if (
        location.pathname !== "/login" &&
        location.pathname !== "/register"
      ) {
        const target = `/login?from=${encodeURIComponent(location.pathname)}`;
        navigate(target, { replace: true });
      }
    }
  }, [isLoading, error, data, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-500">
        <Spinner className="text-neutral-700" />
        <span className="ml-3 text-sm">{t("authGate.checkingSession")}</span>
      </div>
    );
  }

  if (error || !data) return null;

  if (data.role !== "STUDENT") {
    if (typeof window !== "undefined") {
      window.location.href = ROLE_URLS[data.role];
    }
    return null;
  }

  return <>{children}</>;
}
