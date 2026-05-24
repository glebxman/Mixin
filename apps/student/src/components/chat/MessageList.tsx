import { useEffect, useRef } from "react";
import { useI18n } from "@edtech/i18n";
import type { ChatMessage } from "@/hooks/useChats";
import { ShiningText } from "@/components/ui/shining-text";
import logoBlack from "@/assets/logo_black.svg";
import { AssistantMarkdown } from "./AssistantMarkdown";
import { ImageBubble } from "./ImageBubble";

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  userName: string;
}

export function MessageList({ messages, loading, userName }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastMessageContent = messages.at(-1)?.content ?? "";

  useEffect(() => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [messages.length, lastMessageContent, loading]);

  return (
    <div className="mx-auto max-w-[746px] space-y-5 px-4 pb-[190px] pt-16 sm:px-6">
      {messages.map((message) => {
        if (message.role === "image" && message.image) {
          return (
            <ImageBubble
              key={message.id}
              dataUrl={message.image.dataUrl}
              prompt={message.image.prompt}
              loading={message.image.loading}
              error={message.image.error}
            />
          );
        }
        return <Message key={message.id} message={message} userName={userName} />;
      })}
      {loading && <ThinkingIndicator />}
      <div ref={endRef} />
    </div>
  );
}

function Message({
  message,
  userName,
}: {
  message: ChatMessage;
  userName: string;
}) {
  const { t } = useI18n();

  if (message.role === "user") {
    return (
      <div className="animate-fade-in-up flex items-start justify-end">
        <div
          aria-label={t("aria.messageFrom", { name: userName })}
          className="max-w-[72%] overflow-hidden rounded-[24px] bg-white text-[15px] leading-6 text-neutral-950"
        >
          {message.attachments?.map((attachment) => (
            <img
              key={attachment.dataUrl}
              src={attachment.dataUrl}
              alt={attachment.name || t("aria.uploadedImage")}
              className="max-h-72 w-full object-cover"
            />
          ))}
          {message.content.trim() && (
            <div className="whitespace-pre-wrap break-words px-5 py-3">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  const isEmptyAssistant = message.content.trim().length === 0;

  return (
    <div className="animate-fade-in-up">
      <div
        className={
          isEmptyAssistant
            ? "mb-1.5 flex items-center gap-2"
            : "mb-3 flex items-center gap-2"
        }
      >
        <img src={logoBlack} alt="" className="size-5" aria-hidden="true" />
        <span className="font-serif text-xl font-semibold leading-none tracking-tight text-neutral-950">
          mixin
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">
          {t("chat.modelLiteBadge")}
        </span>
      </div>
      {!isEmptyAssistant && (
        <div className="min-w-0 flex-1 pt-0.5">
          <AssistantMarkdown content={message.content} />
        </div>
      )}
    </div>
  );
}

function ThinkingIndicator() {
  const { t } = useI18n();
  return (
    <div className="animate-fade-in flex items-center gap-2 text-sm">
      <span className="mixin-thinking-shape size-2.5 shrink-0" />
      <ShiningText text={t("chat.thinkingShort")} className="text-sm leading-6" />
    </div>
  );
}
