import { Squares2X2Icon, TrashIcon } from "@heroicons/react/24/outline";
import { ScrollArea, cn } from "@edtech/ui";
import { useI18n } from "@edtech/i18n";
import type { ChatSession } from "@/hooks/useChats";

export function SidebarHistory({
  chats,
  activeChatId: _activeChatId,
  onSelect,
  onDelete,
}: {
  chats: ChatSession[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <ScrollArea className="mt-7 flex-1 px-3 pb-3">
      <div className="mb-2 flex items-center justify-between px-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        <span>{t("chat.allTasks")}</span>
        <Squares2X2Icon className="size-4" />
      </div>
      {chats.length === 0 ? (
        <p className="px-2 py-2 text-sm leading-5 text-neutral-500">
          {t("chat.recentTasksHint")}
        </p>
      ) : (
        <ul className="space-y-1">
          {chats.map((chat) => (
            <li key={chat.id}>
              <ChatHistoryItem
                chat={chat}
                onSelect={() => onSelect(chat.id)}
                onDelete={() => onDelete(chat.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </ScrollArea>
  );
}

function ChatHistoryItem({
  chat,
  onSelect,
  onDelete,
}: {
  chat: ChatSession;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "group flex h-11 items-center rounded-full transition-colors hover:bg-neutral-100",
      )}
    >
      <button
        type="button"
        className="min-w-0 flex-1 truncate px-4 text-left text-sm text-neutral-950"
        onClick={onSelect}
      >
        {chat.title}
      </button>
      <button
        type="button"
        aria-label={t("aria.deleteChat")}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="mr-1 grid size-8 shrink-0 place-items-center rounded-full text-neutral-400 opacity-0 transition hover:bg-neutral-200 hover:text-neutral-950 group-hover:opacity-100"
      >
        <TrashIcon className="size-4" />
      </button>
    </div>
  );
}
