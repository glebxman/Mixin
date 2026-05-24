import { memo, useEffect, useRef, useState } from "react";
import { useI18n } from "@edtech/i18n";

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "strict",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  });
  initialized = true;
}

/**
 * Кэш отрендеренных SVG: одинаковый код → один результат.
 * Это убирает «моргание» при родительских ре-рендерах.
 */
const renderCache = new Map<string, string>();
let counter = 0;

function MermaidDiagramImpl({ code }: { code: string }) {
  const { t } = useI18n();
  const trimmed = code.trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(() => renderCache.has(trimmed));

  useEffect(() => {
    let cancelled = false;
    const cached = renderCache.get(trimmed);

    if (cached) {
      if (containerRef.current) {
        containerRef.current.innerHTML = cached;
      }
      setReady(true);
      setError(null);
      return;
    }

    const id = `mermaid-${++counter}`;

    (async () => {
      try {
        await ensureInit();
        const { default: mermaid } = await import("mermaid");
        const { svg } = await mermaid.render(id, trimmed);
        if (cancelled) return;
        renderCache.set(trimmed, svg);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setReady(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        // -ноды из <body> (баг mermaid)
        document.querySelectorAll(`#${id}`).forEach((el) => el.remove());
        setError(err instanceof Error ? err.message : t("chat.diagramError"));
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trimmed, t]);

  if (error) {
    return (
      <div className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="mb-2 font-medium">{t("chat.diagramRenderError")}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
          {trimmed}
        </pre>
      </div>
    );
  }

  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-4">
      {!ready && <div className="skeleton h-32" aria-label={t("chat.diagramLoading")} />}
      <div
        ref={containerRef}
        className="[&_svg]:mx-auto [&_svg]:max-w-full"
        // SVG вставляется императивно через ref, чтобы избежать
        // повторных DOM-операций React при ре-рендерах
      />
    </div>
  );
}

/**
 * Memoized по `code` — родительский ре-рендер AssistantMarkdown
 * больше не вызывает повторный mermaid.render().
 */
export const MermaidDiagram = memo(
  MermaidDiagramImpl,
  (prev, next) => prev.code.trim() === next.code.trim(),
);
