import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  API_URL,
  authApi,
  ROLE_URLS,
  safeRedirectPath,
} from "@edtech/api-client";
import type { Grade, Role } from "@edtech/types";
import { Spinner } from "@edtech/ui";
import { useI18n } from "@edtech/i18n";
import { AuthDotBackground } from "@/pages/auth/AuthDotBackground";
import { GoogleIcon } from "@/pages/auth/GoogleIcon";

type Mode = "login" | "register";

const GRADES: Array<{ value: Grade; label: string }> = Array.from(
  { length: 11 },
  (_, index) => ({
    value: `G${index + 1}` as Grade,
    label: `${index + 1}`,
  }),
);

const inputClassName =
  "h-[52px] w-full rounded-full border border-neutral-200 bg-white px-5 text-base text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900";

export function AuthPage({ mode }: { mode: Mode }) {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("STUDENT");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromPath = safeRedirectPath(searchParams.get("from"), "/");
  const googleEmail =
    searchParams.get("google") === "1"
      ? String(searchParams.get("email") || "").trim()
      : "";
  const googleFirstName = String(searchParams.get("firstName") || "");
  const googleLastName = String(searchParams.get("lastName") || "");
  const { t, lang } = useI18n();

  const isRegister = mode === "register";
  const isGoogleCompletion = isRegister && googleEmail.length > 0;
  const title = isRegister ? t("auth.registerTitle") : t("auth.loginTitle");
  const hint = isGoogleCompletion
    ? t("auth.googleConfirmHint")
    : isRegister
      ? t("auth.registerHint")
      : t("auth.loginHint");
  const switchLabel = isRegister ? t("auth.login") : t("auth.register");
  const switchTo = isRegister ? "/login" : "/register";
  const submitLabel = isRegister ? t("auth.registerButton") : t("auth.loginButton");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = googleEmail || String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      if (!isRegister) {
        const result = await authApi.login({ email, password });
        redirectByRole(result.user.role, navigate, fromPath);
        return;
      }

      const selectedRole = String(formData.get("role") || "STUDENT") as Role;
      const grade = String(formData.get("grade") || "") as Grade;
      const schoolName = String(formData.get("schoolName") || "").trim();

      const payload = {
        password,
        firstName: String(formData.get("firstName") || "").trim(),
        lastName: String(formData.get("lastName") || "").trim(),
        role: selectedRole,
        grade: selectedRole === "STUDENT" ? grade : undefined,
        schoolName: schoolName || undefined,
        phone: String(formData.get("phone") || "").trim() || undefined,
        language: lang,
      } as const;

      const result = isGoogleCompletion
        ? await authApi.completeGoogleSignup(payload)
        : await authApi.register({ email, ...payload });

      redirectByRole(result.user.role, navigate, "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errorRequest"));
    } finally {
      setLoading(false);
    }
  }

  function startGoogleAuth() {
    setError(null);
    setGoogleLoading(true);
    const params = new URLSearchParams({
      from: isRegister ? "/profile" : fromPath,
      mode,
    });
    window.location.href = `${API_URL}/api/auth/google?${params.toString()}`;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-neutral-950">
      <AuthDotBackground />

      <header className="relative z-10 flex h-16 items-center px-6">
        <Link
          to="/login"
          className="text-2xl font-semibold tracking-tight text-neutral-950"
        >
          Mixin
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[420px] flex-col items-center justify-center px-6 pb-10 pt-6">
        <section className="w-full">
          <div className="mb-8 text-center">
            <h1 className="text-[28px] font-semibold leading-tight tracking-normal text-neutral-950">
              {title}
            </h1>
            <p className="mx-auto mt-4 max-w-[330px] text-base leading-6 text-neutral-600">
              {hint}
            </p>
          </div>

          {!isGoogleCompletion && (
            <>
              <button
                type="button"
                disabled={loading || googleLoading}
                onClick={startGoogleAuth}
                className="flex h-[53px] w-full items-center justify-center gap-3 rounded-full border border-neutral-200 bg-white px-5 text-base font-medium text-neutral-900 transition-colors hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-70"
              >
                <GoogleIcon />
                <span>{t("auth.continueWithGoogle")}</span>
                {googleLoading && <Spinner className="text-neutral-900" />}
              </button>

              <div className="my-6 flex items-center gap-4 text-sm text-neutral-500">
                <span className="h-px flex-1 bg-neutral-200" />
                <span>{t("auth.or")}</span>
                <span className="h-px flex-1 bg-neutral-200" />
              </div>
            </>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="firstName"
                  required
                  maxLength={64}
                  defaultValue={googleFirstName}
                  autoComplete="given-name"
                  placeholder={t("auth.firstName")}
                  className={inputClassName}
                />
                <input
                  name="lastName"
                  required
                  maxLength={64}
                  defaultValue={googleLastName}
                  autoComplete="family-name"
                  placeholder={t("auth.lastName")}
                  className={inputClassName}
                />
              </div>
            )}

            {isGoogleCompletion ? (
              <div className="rounded-full border border-neutral-200 bg-neutral-50 px-5 py-3">
                <p className="text-sm text-[#6084ff]">
                  {t("auth.googleVerifiedEmail")}
                </p>
                <p className="mt-1 truncate text-base text-neutral-950">{googleEmail}</p>
              </div>
            ) : (
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder={t("auth.email")}
                className={inputClassName}
              />
            )}

            <div>
              <input
                name="password"
                type="password"
                required
                minLength={isRegister ? 8 : 1}
                maxLength={128}
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={t("auth.password")}
                className={inputClassName}
              />
              {isRegister && (
                <span className="mt-2 block px-1 text-xs leading-5 text-neutral-500">
                  {t("auth.passwordMinLengthHint")}
                </span>
              )}
            </div>

            {isRegister && (
              <>
                <select
                  name="role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                  className={inputClassName}
                >
                  <option className="bg-white text-neutral-950" value="STUDENT">
                    {t("panels.student")}
                  </option>
                  <option className="bg-white text-neutral-950" value="PARENT">
                    {t("panels.parent")}
                  </option>
                </select>

                {role === "STUDENT" && (
                  <div className="grid grid-cols-2 gap-3">
                    <select name="grade" required className={inputClassName}>
                      <option className="bg-white text-neutral-400" value="">
                        {t("profile.gradeTitle")}
                      </option>
                      {GRADES.map((grade) => (
                        <option
                          key={grade.value}
                          className="bg-white text-neutral-950"
                          value={grade.value}
                        >
                          {t("common.gradeValue", { grade: grade.label })}
                        </option>
                      ))}
                    </select>
                    <input
                      name="schoolName"
                      required
                      maxLength={200}
                      placeholder={t("auth.schoolPlaceholder")}
                      className={inputClassName}
                    />
                  </div>
                )}

                <input
                  name="phone"
                  maxLength={32}
                  autoComplete="tel"
                  placeholder="+998"
                  className={inputClassName}
                />
              </>
            )}

            {error && (
              <p className="rounded-2xl border border-[#e92554]/25 bg-[#e92554]/10 px-4 py-3 text-sm leading-5 text-[#e92554]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 text-base font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-70"
            >
              {loading && <Spinner className="text-white" />}
              {loading ? t("common.pleaseWait") : submitLabel}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            {isRegister ? t("auth.alreadyHaveAccount") : t("auth.dontHaveAccount")}{" "}
            <Link
              to={switchTo}
              className="font-medium text-neutral-950 underline underline-offset-2"
            >
              {switchLabel}
            </Link>
          </p>
        </section>

        <footer className="mt-14 text-center text-sm leading-6 text-neutral-500">
          <a href="#" className="underline underline-offset-2 hover:text-neutral-900">
            {t("auth.termsOfService")}
          </a>
          <span className="mx-3">|</span>
          <a href="#" className="underline underline-offset-2 hover:text-neutral-900">
            {t("auth.privacyPolicy")}
          </a>
        </footer>
      </main>
    </div>
  );
}

function redirectByRole(
  role: Role,
  navigate: (path: string) => void,
  fromPath: string,
) {
  if (role === "STUDENT") {
    navigate(fromPath || "/");
    return;
  }
  window.location.href = ROLE_URLS[role];
}
