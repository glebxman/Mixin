/**
 * Theme management — единый модуль для светлой/тёмной/авто темы.
 *
 * Использование:
 *   - На старте приложения вызвать applyStoredTheme() в main.tsx.
 *   - В UI: const { theme, setTheme } = useTheme();
 *
 * Особенности:
 *   - При theme="auto" слушаем prefers-color-scheme и реагируем
 *     на смену системной темы в реальном времени.
 *   - Пишем и в documentElement, и в body (legacy CSS-селекторы
 *     полагаются на оба класса).
 */

import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "auto";

const STORAGE_KEY = "mixin_theme";
const DEFAULT_THEME: Theme = "light";

const THEMES: ReadonlyArray<Theme> = ["light", "dark", "auto"];

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as ReadonlyArray<string>).includes(value);
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return isTheme(raw) ? raw : DEFAULT_THEME;
}

function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDarkClass(isDark: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;
  if (isDark) {
    root.classList.add("dark");
    body?.classList.add("dark");
  } else {
    root.classList.remove("dark");
    body?.classList.remove("dark");
  }
}

function resolveDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return prefersDark();
}

/**
 * Применяет сохранённую тему при загрузке (вызывать в main до рендера).
 * Не подписывается на смену системной темы — это делает useTheme().
 */
export function applyStoredTheme(): void {
  const theme = getStoredTheme();
  applyDarkClass(resolveDark(theme));
}

/**
 * Сохраняет и применяет тему. При "auto" подписка на смену системной
 * темы поддерживается отдельно через useTheme.
 */
export function setStoredTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyDarkClass(resolveDark(theme));
}

/**
 * Хук для использования в UI: возвращает текущую тему и сеттер.
 * При theme="auto" автоматически реагирует на изменение системной темы.
 */
export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    applyDarkClass(resolveDark(theme));
  }, [theme]);

  // При "auto" подписываемся на смену системной темы
  useEffect(() => {
    if (theme !== "auto" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyDarkClass(prefersDark());
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  function setTheme(next: Theme) {
    setStoredTheme(next);
    setThemeState(next);
  }

  return { theme, setTheme };
}
