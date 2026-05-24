import { call } from "./http";
import { API_URL } from "./env";

export type ChatActions = {
  questProposal: { topic: string; confidence: number } | null;
  quickCheck: boolean;
  hasVisual: boolean;
  /** Если AI решил, что нужно сгенерировать реальное изображение —
   *  фронт должен дёрнуть aiApi.generateImage с этим prompt. */
  imagePrompt: string | null;
};

export type ChatStateInfo = {
  topic: string | null;
  confidence: number;
  messagesOnTopic: number;
};

export type ChatResponse = {
  reply: string;
  tokensUsed: number;
  sessionId: string;
  actions: ChatActions;
  state: ChatStateInfo;
};

export type ChatAttachment = {
  type: "image";
  dataUrl: string;
  mimeType: string;
  name?: string;
};

export type ChatStreamDone = {
  sessionId: string;
  reply: string;
  tokensUsed: number;
  actions: ChatActions;
  state: ChatStateInfo;
};

export type ChatStreamHandlers = {
  onSession?: (sessionId: string) => void;
  onDelta?: (content: string) => void;
};

export type GeneratedImage = {
  dataUrl: string;
  prompt: string;
  model: string;
};

export type StoredChatImage = {
  dataUrl: string;
  prompt: string;
  model?: string;
  loading?: boolean;
  error?: string;
};

export type StoredChatMessage = {
  role: string;
  content: string;
  createdAt?: string;
  proposal?: { topic: string; confidence: number };
  image?: StoredChatImage;
  attachments?: ChatAttachment[];
};

export type SessionListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionDetail = {
  id: string;
  title: string;
  messages: StoredChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export const aiApi = {
  /**
   * SECURITY: история берётся сервером из БД по sessionId.
   */
  chat: (input: {
    message: string;
    sessionId?: string;
    subjectId?: string | null;
    images?: ChatAttachment[];
  }) =>
    call<ChatResponse>({
      method: "POST",
      url: "/api/ai/chat",
      data: input,
    }),

  streamChat: async (
    input: {
      message: string;
      sessionId?: string;
      subjectId?: string | null;
      images?: ChatAttachment[];
    },
    handlers: ChatStreamHandlers = {},
  ): Promise<ChatStreamDone> => {
    const csrf = readCookie("edtech_csrf") || (await fetchCsrfToken());
    const response = await fetch(`${API_URL}/api/ai/chat/stream`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: JSON.stringify(input),
    });

    if (!response.ok && response.status === 404) {
      const result = await aiApi.chat(input);
      handlers.onSession?.(result.sessionId);
      handlers.onDelta?.(result.reply);
      return {
        sessionId: result.sessionId,
        reply: result.reply,
        tokensUsed: result.tokensUsed,
        actions: result.actions,
        state: result.state,
      };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        readApiError(text) ||
          `Request failed with status ${response.status} at ${API_URL}/api/ai/chat/stream`,
      );
    }
    if (!response.body) {
      throw new Error("Streaming is not supported by this browser");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sessionId = input.sessionId ?? "";
    let finalReply = "";
    let streamResult: ChatStreamDone | null = null;

    const handleLine = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line) as
        | { type: "session"; sessionId: string }
        | { type: "delta"; content: string }
        | {
            type: "done";
            sessionId: string;
            reply: string;
            tokensUsed?: number;
            actions?: ChatActions;
            state?: ChatStateInfo;
          }
        | { type: "error"; error: string };

      if (event.type === "session") {
        sessionId = event.sessionId;
        handlers.onSession?.(event.sessionId);
        return;
      }
      if (event.type === "delta") {
        finalReply += event.content;
        handlers.onDelta?.(event.content);
        return;
      }
      if (event.type === "done") {
        sessionId = event.sessionId;
        finalReply = event.reply || finalReply;
        streamResult = {
          sessionId,
          reply: finalReply,
          tokensUsed: event.tokensUsed ?? 0,
          actions:
            event.actions ?? {
              questProposal: null,
              quickCheck: false,
              hasVisual: false,
              imagePrompt: null,
            },
          state:
            event.state ?? {
              topic: null,
              confidence: 0,
              messagesOnTopic: 0,
            },
        };
        return;
      }
      if (event.type === "error") {
        throw new Error(event.error);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        handleLine(line);
      }
    }
    buffer += decoder.decode();
    handleLine(buffer);

    return (
      streamResult ?? {
        sessionId,
        reply: finalReply,
        tokensUsed: 0,
        actions: {
          questProposal: null,
          quickCheck: false,
          hasVisual: false,
          imagePrompt: null,
        },
        state: {
          topic: null,
          confidence: 0,
          messagesOnTopic: 0,
        },
      }
    );
  },

  /**
   * Генерация изображения через OpenRouter.
   * Лимит: FREE 5/день, BASIC 30, PREMIUM 100.
   * Таймаут 100 сек — генерация может быть долгой, но не бесконечной.
   */
  generateImage: (prompt: string, sessionId?: string | null) =>
    call<GeneratedImage>({
      method: "POST",
      url: "/api/ai/generate-image",
      data: { prompt, ...(sessionId ? { sessionId } : {}) },
      timeout: 100_000,
    }),

  /** Список сессий (без сообщений) для сайдбара. */
  listSessions: () =>
    call<SessionListItem[]>({ method: "GET", url: "/api/ai/sessions" }),

  /** Загрузить полную сессию с сообщениями. */
  getSession: (sessionId: string) =>
    call<SessionDetail>({ method: "GET", url: `/api/ai/sessions/${sessionId}` }),

  /** Удалить сессию. */
  deleteSession: (sessionId: string) =>
    call<null>({ method: "DELETE", url: `/api/ai/sessions/${sessionId}` }),
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchCsrfToken(): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/auth/csrf`, {
      credentials: "include",
    });
    const payload = (await response.json()) as { data?: { csrfToken?: string } };
    return payload.data?.csrfToken ?? "";
  } catch {
    return "";
  }
}

function readApiError(text: string): string {
  try {
    const payload = JSON.parse(text) as { error?: string };
    return payload.error ?? "";
  } catch {
    return text;
  }
}
