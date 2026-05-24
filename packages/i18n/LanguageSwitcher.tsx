import { useEffect, useRef, useState } from "react";
import { LANG_LABELS, SUPPORTED_LANGS, useI18n, type Lang } from "./index";

/**
 * Минималистичный селектор языка. Используется в footer/header сайдбара.
 * Стили совместимы с tailwind 4 + neutral-палитрой.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const code = lang.toUpperCase();

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
      >
        <span>🌐</span>
        <span>{compact ? code : LANG_LABELS[lang]}</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 min-w-[140px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          {SUPPORTED_LANGS.map((l: Lang) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                l === lang ? "bg-neutral-100 font-medium" : "hover:bg-neutral-50"
              }`}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
