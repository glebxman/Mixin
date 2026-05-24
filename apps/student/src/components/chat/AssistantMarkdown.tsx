import { Suspense, lazy, memo } from "react";

/**
 * Lightweight shell over the heavy markdown renderer.
 *
 * The actual renderer (with `rehype-katex`, `remark-math`, the katex
 * stylesheet, and the mermaid bridge) lives in
 * `./AssistantMarkdownRenderer.tsx`. We `React.lazy`-load it so those
 * dependencies are split into a chat-only chunk and never appear in
 * the initial app bundle (R13.2).
 */

const AssistantMarkdownRenderer = lazy(
  () => import("./AssistantMarkdownRenderer"),
);

function AssistantMarkdownImpl({ content }: { content: string }) {
  return (
    <Suspense
      fallback={
        <div className="text-[15px] leading-7 whitespace-pre-wrap text-neutral-900">
          {content}
        </div>
      }
    >
      <AssistantMarkdownRenderer content={content} />
    </Suspense>
  );
}

/**
 * Memo: при добавлении нового сообщения в список старые AssistantMarkdown
 * не перерендериваются — критично для тяжёлого mermaid.
 */
export const AssistantMarkdown = memo(
  AssistantMarkdownImpl,
  (prev, next) => prev.content === next.content,
);
