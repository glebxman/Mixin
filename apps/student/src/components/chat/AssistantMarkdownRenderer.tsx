import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeOptions,
} from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@edtech/ui";
import { MermaidDiagram } from "./MermaidDiagram";
import { QuestRunner } from "../quests/QuestRunner";
import "katex/dist/katex.min.css";

/**
 * Heavy markdown renderer for the chat view only.
 *
 * `rehype-katex`, `remark-math`, and the `katex` stylesheet are
 * intentionally imported here (not in the lightweight shell at
 * `AssistantMarkdown.tsx`) so the initial app bundle does not pay for
 * them. The shell loads this module via `React.lazy`, which means
 * mermaid + katex code only ship to the browser when the chat view is
 * rendered.
 */

const sanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "style"],
    a: [["href", /^https?:\/\//, /^mailto:/], "title", "rel", "target"],
    code: [["className", /^language-/]],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "math",
    "annotation",
    "semantics",
    "mrow",
    "mi",
    "mn",
    "mo",
    "ms",
    "mtext",
    "msup",
    "msub",
    "msubsup",
    "mfrac",
    "mroot",
    "msqrt",
    "munder",
    "mover",
    "munderover",
    "mtable",
    "mtr",
    "mtd",
    "span",
  ],
};

const components: Components = {
  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-neutral-950">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => {
    const safeHref =
      typeof href === "string" &&
      (href.startsWith("https://") || href.startsWith("mailto:"))
        ? href
        : undefined;
    return (
      <a
        className="font-medium text-[#6084ff] underline underline-offset-2 hover:text-[#6084ff]"
        href={safeHref}
        rel="noreferrer noopener"
        target="_blank"
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="mb-4 ml-5 list-disc space-y-2 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-5 list-decimal space-y-2 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-neutral-300 pl-4 text-neutral-500">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-5 border-neutral-200" />,
  pre: ({ children }) => {
    const child = Array.isArray(children) ? children[0] : children;
    if (
      child &&
      typeof child === "object" &&
      "props" in child
    ) {
      if (child.props?.className === "language-mermaid") {
        const code =
          typeof child.props.children === "string"
            ? child.props.children
            : Array.isArray(child.props.children)
              ? child.props.children.join("")
              : "";
        return <MermaidDiagram code={code.trim()} />;
      }
      if (child.props?.className === "language-quest") {
        const code =
          typeof child.props.children === "string"
            ? child.props.children
            : Array.isArray(child.props.children)
              ? child.props.children.join("")
              : "";
        return <QuestRunner code={code.trim()} />;
      }
    }
    return (
      <pre className="my-4 overflow-x-auto rounded-xl bg-neutral-50 p-4 text-[13px] leading-6 text-neutral-900">
        {children}
      </pre>
    );
  },
  code: ({ children, className }) => (
    <code
      className={cn(
        "rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px] text-neutral-900",
        className,
      )}
    >
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-neutral-200 px-3 py-2 align-top">{children}</td>
  ),
};

function AssistantMarkdownRendererImpl({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-7 text-neutral-900">
      <ReactMarkdown
        components={components}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const AssistantMarkdownRenderer = memo(
  AssistantMarkdownRendererImpl,
  (prev, next) => prev.content === next.content,
);

export default AssistantMarkdownRenderer;
