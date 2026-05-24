import type { ReactNode } from "react";
import { Spinner } from "./Spinner";

export type AuthSourceState<U> =
  | { data: U; isLoading: false; error: null }
  | { data: null; isLoading: false; error: unknown }
  | { data: undefined; isLoading: true; error: null };

export type AuthSource<U> = {
  useUser: () => {
    data: U | null | undefined;
    isLoading: boolean;
    error: unknown;
  };
};

export type AuthGuardProps<U extends { role: string }> = {
  /** Hook source for the current user. `useUser` is called once per render. */
  source: AuthSource<U>;
  /** Role required to render `children`. */
  expectedRole: U["role"];
  /** Resolves the redirect URL when the user has a different role. */
  resolveRedirect: (role: U["role"]) => string;
  /** URL to redirect unauthenticated/errored sessions to (e.g. STUDENT_URL + "/login"). */
  loginUrl: string;
  /** Optional custom loading fallback. Defaults to a centred spinner with Russian copy. */
  fallback?: ReactNode;
  children: ReactNode;
};

function DefaultFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-neutral-500">
      <Spinner className="text-neutral-700" />
      <span className="ml-3 text-sm">Проверяем сессию...</span>
    </div>
  );
}

export function AuthGuard<U extends { role: string }>(
  props: AuthGuardProps<U>,
) {
  const { data, isLoading, error } = props.source.useUser();

  if (isLoading) {
    return <>{props.fallback ?? <DefaultFallback />}</>;
  }

  if (error || !data) {
    if (typeof window !== "undefined") {
      window.location.href = props.loginUrl;
    }
    return null;
  }

  if (data.role !== props.expectedRole) {
    if (typeof window !== "undefined") {
      window.location.href = props.resolveRedirect(data.role);
    }
    return null;
  }

  return <>{props.children}</>;
}
