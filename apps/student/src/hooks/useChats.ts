import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@edtech/api-client";
import type { ChatAttachment, SessionListItem, StoredChatMessage } from "@edtech/api-client";
import { useI18n } from "@edtech/i18n";

export type ChatMessageRole = "user" | "assistant" | "image";

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  /** Для image: data URL и prompt */
  image?: { dataUrl: string; prompt: string; loading?: boolean; error?: string };
  attachments?: ChatAttachment[];
};

export type ChatSession = {
  id: string;
  /** Серверный sessionId (AiSession.id). Теперь это primary key. */
  serverSessionId?: string | null;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function sortChats(chats: ChatSession[]) {
  return [...chats].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function createTitle(content: string, t: any) {
  const title = content.trim().replace(/\s+/g, " ");
  return title.length > 42 ? `${title.slice(0, 42)}...` : title || t("hooks.chats.newChat");
}

export function clearChatsStorage() {
  // Legacy localStorage cleanup
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("mixin_student_ai_chats");
  }
}

/**
 * Конвертирует серверную сессию (список) в локальный ChatSession.
 * Messages подгружаются лениво при выборе чата.
 */
function serverSessionToLocal(s: SessionListItem, t: any): ChatSession {
  return {
    id: s.id,
    serverSessionId: s.id,
    title: s.title || t("hooks.chats.newChat"),
    messages: [],
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export function useChats() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const { data: serverSessions } = useQuery({
    queryKey: ["ai-sessions"],
    queryFn: () => aiApi.listSessions(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const [localChats, setLocalChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [draftNewChat, setDraftNewChat] = useState(false);
  const [loadedSessionIds, setLoadedSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!serverSessions) return;
    setLocalChats((current) => {
      const serverMap = new Map(serverSessions.map((s) => [s.id, s]));
      const merged: ChatSession[] = [];

      for (const ss of serverSessions) {
        const existing = current.find((c) => c.serverSessionId === ss.id);
        if (existing) {
          merged.push({ ...existing, title: ss.title || existing.title });
        } else {
          merged.push(serverSessionToLocal(ss, t));
        }
      }

      for (const local of current) {
        if (!local.serverSessionId && !serverMap.has(local.id)) {
          merged.push(local);
        }
      }

      return sortChats(merged);
    });
  }, [serverSessions]);

  useEffect(() => {
    if (activeChatId === null && localChats.length > 0 && !draftNewChat) {
      setActiveChatIdState(localChats[0].id);
    }
  }, [localChats, activeChatId, draftNewChat]);

  useEffect(() => {
    if (!activeChatId) return;
    const chat = localChats.find((c) => c.id === activeChatId);
    if (!chat?.serverSessionId) return;
    if (loadedSessionIds.has(chat.serverSessionId)) return;
    if (chat.messages.length > 0) return;

    const sessionId = chat.serverSessionId;
    let cancelled = false;
    aiApi
      .getSession(sessionId)
      .then((session) => {
        if (cancelled) return;
        const messages: ChatMessage[] = (session.messages || [])
          .map((m: StoredChatMessage, i: number): ChatMessage | null => {
            if (m.role === "image") {
              if (!m.image?.dataUrl) return null;
              return {
                id: `${session.id}-${i}`,
                role: "image",
                content: "",
                createdAt: m.createdAt ?? session.createdAt,
                image: {
                  dataUrl: m.image.dataUrl,
                  prompt: m.image.prompt,
                  loading: false,
                },
              };
            }

            const role: ChatMessageRole = m.role === "user" ? "user" : "assistant";
            return {
              id: `${session.id}-${i}`,
              role,
              content: m.content ?? "",
              createdAt: m.createdAt ?? session.createdAt,
              attachments: m.attachments,
            };
          })
          .filter((message): message is ChatMessage => Boolean(message));
        setLocalChats((current) =>
          current.map((c) =>
            c.id === activeChatId ? { ...c, messages } : c,
          ),
        );
        setLoadedSessionIds((prev) => {
          if (prev.has(sessionId)) return prev;
          const next = new Set(prev);
          next.add(sessionId);
          return next;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeChatId, localChats, loadedSessionIds]);

  const chats = localChats;

  const setActiveChatId = useCallback((chatId: string | null) => {
    setDraftNewChat(false);
    setActiveChatIdState(chatId);
  }, []);

  const startNewChat = useCallback(() => {
    setDraftNewChat(true);
    setActiveChatIdState(null);
  }, []);

  const deleteChat = useCallback(
    (chatId: string) => {
      const chat = localChats.find((c) => c.id === chatId);
      if (chat?.serverSessionId) {
        aiApi.deleteSession(chat.serverSessionId).catch(() => {});
      }

      setLocalChats((current) => {
        const next = sortChats(current.filter((c) => c.id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatIdState(next[0]?.id ?? null);
          setDraftNewChat(false);
        }
        return next;
      });

      queryClient.invalidateQueries({ queryKey: ["ai-sessions"] });
    },
    [localChats, activeChatId, queryClient],
  );

  const appendMessage = useCallback(
    (chatId: string | null, message: ChatMessage) => {
      setLocalChats((current) => {
        const finalChatId = chatId ?? generateId();
        const exists = current.some((c) => c.id === finalChatId);

        const next = exists
          ? current.map((c) =>
              c.id === finalChatId
                ? {
                    ...c,
                    title: c.title || createTitle(message.content, t),
                    messages: [...c.messages, message],
                    updatedAt: message.createdAt,
                  }
                : c,
            )
          : [
              {
                id: finalChatId,
                serverSessionId: null,
                title: createTitle(message.content, t),
                messages: [message],
                createdAt: message.createdAt,
                updatedAt: message.createdAt,
              },
              ...current,
            ];

        const sorted = sortChats(next);
        if (!chatId) {
          setDraftNewChat(false);
          setActiveChatIdState(finalChatId);
        }
        return sorted;
      });
    },
    [t],
  );

  /** Обновить отдельное сообщение (например, image: loading → ready). */
  const updateMessage = useCallback(
    (chatId: string, messageId: string, patch: Partial<ChatMessage>) => {
      setLocalChats((current) =>
        current.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, ...patch } : m,
                ),
              }
            : c,
        ),
      );
    },
    [],
  );

  const setServerSessionId = useCallback(
    (chatId: string, serverSessionId: string) => {
      setLocalChats((current) =>
        current.map((c) =>
          c.id === chatId ? { ...c, serverSessionId } : c,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["ai-sessions"] });
    },
    [queryClient],
  );

  return {
    chats,
    activeChatId,
    setActiveChatId,
    startNewChat,
    deleteChat,
    appendMessage,
    updateMessage,
    setServerSessionId,
  };
}
