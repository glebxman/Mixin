/**
 * @edtech/i18n — лёгкий i18n-провайдер для всех фронтов.
 *
 * Использование:
 *   <I18nProvider>
 *     <App />
 *   </I18nProvider>
 *
 *   const { t, lang, setLang } = useI18n();
 *   <h1>{t("chat.title")}</h1>
 *   <p>{t("chat.drawing", { prompt: "..." })}</p>
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ru from "./locales/ru.json";
import uz from "./locales/uz.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["ru", "uz", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const TRANSLATIONS: Record<Lang, Record<string, unknown>> = { ru, uz, en };

const STORAGE_KEY = "mixin_lang";
const DEFAULT_LANG: Lang = "ru";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGS.includes(stored as Lang)) {
    return stored as Lang;
  }
  const browser = window.navigator.language?.slice(0, 2).toLowerCase();
  if (browser && SUPPORTED_LANGS.includes(browser as Lang)) {
    return browser as Lang;
  }
  return DEFAULT_LANG;
}

function lookup(dict: Record<string, unknown>, path: string): string | null {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return typeof cur === "string" ? cur : null;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

type I18nContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: string, varsOrFallback?: Record<string, string | number> | string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitialLang());

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    if (SUPPORTED_LANGS.includes(next)) setLangState(next);
  }, []);

  const t = useCallback(
    (key: string, varsOrFallback?: Record<string, string | number> | string, fallback?: string): string => {
      const vars = typeof varsOrFallback === "object" ? varsOrFallback : undefined;
      const fb = typeof varsOrFallback === "string" ? varsOrFallback : fallback;
      const dict = TRANSLATIONS[lang] ?? TRANSLATIONS[DEFAULT_LANG];
      const fallbackDict = TRANSLATIONS[DEFAULT_LANG];
      const value = lookup(dict, key) ?? lookup(fallbackDict, key) ?? fb ?? key;
      return interpolate(value, vars);
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return ctx;
}

export const LANG_LABELS: Record<Lang, string> = {
  ru: "Русский",
  uz: "Oʻzbekcha",
  en: "English",
};
