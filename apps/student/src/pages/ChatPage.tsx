import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  aiApi,
  authApi,
  getPlanLabelKey,
  subscriptionApi,
  type ChatAttachment,
} from "@edtech/api-client";
import { useI18n } from "@edtech/i18n";
import { ChevronDownIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "motion/react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { Composer } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import {
  ChatModelMenu,
  getModelTitle,
  type ChatModel,
} from "@/components/chat/ChatModelMenu";
import { UpgradeModal } from "@/components/settings/UpgradeModal";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { clearChatsStorage, generateId, useChats } from "@/hooks/useChats";
import { isInsufficientCreditsError } from "@/lib/errors";

interface ChatPageProps {
  userName: string;
  userEmail?: string;
}

type WorkspacePanel = "chat" | "analytics";

export function ChatPage({ userName, userEmail }: ChatPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const {
    chats,
    activeChatId,
    setActiveChatId,
    startNewChat,
    deleteChat,
    appendMessage,
    updateMessage,
    setServerSessionId,
  } = useChats();
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<ChatAttachment | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ChatModel>("lite");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("chat");

  const { data: subInfo, refetch: refetchSubInfo } = useQuery({
    queryKey: ["subscription", "info"],
    queryFn: () => subscriptionApi.getInfo(),
  });

  const isPro = subInfo?.plan === "BASIC" || subInfo?.plan === "PREMIUM";

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId],
  );
  const messages = activeChat?.messages ?? [];
  const isEmpty = messages.length === 0;

  function planLabel(plan: string | undefined): string {
    return t(getPlanLabelKey(plan));
  }

  async function send() {
    const content = input.trim();
    const imageToSend = selectedImage;
    if ((!content && !imageToSend) || isSending || isGeneratingImage) return;

    const now = new Date().toISOString();
    const localChatId = activeChatId ?? generateId();
    const serverSessionId = activeChat?.serverSessionId ?? undefined;
    const assistantMessageId = generateId();

    setActiveChatId(localChatId);
    appendMessage(localChatId, {
      id: generateId(),
      role: "user",
      content: content || t("chat.photo"),
      createdAt: now,
      attachments: imageToSend ? [imageToSend] : undefined,
    });

    if (subInfo && subInfo.remainingCredits < 1) {
      appendMessage(localChatId, {
        id: assistantMessageId,
        role: "assistant",
        content: t("chat.noCreditsError"),
        createdAt: new Date().toISOString(),
      });
      setInput("");
      setSelectedImage(null);
      setUpgradeOpen(true);
      return;
    }

    appendMessage(localChatId, {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    });
    setInput("");
    setSelectedImage(null);
    setIsSending(true);

    let imagePrompt: string | null = null;
    let imageSessionId: string | null = serverSessionId ?? null;

    try {
      let streamedReply = "";
      const result = await aiApi.streamChat(
        {
          message: content || t("chat.imagePrompt"),
          sessionId: serverSessionId,
          images: imageToSend ? [imageToSend] : undefined,
        },
        {
          onSession: (sessionId) => {
            if (!serverSessionId) {
              setServerSessionId(localChatId, sessionId);
            }
          },
          onDelta: (chunk) => {
            streamedReply += chunk;
            updateMessage(localChatId, assistantMessageId, {
              content: streamedReply,
            });
          },
        },
      );

      if (result.sessionId && !serverSessionId) {
        setServerSessionId(localChatId, result.sessionId);
      }

      imageSessionId = result.sessionId || imageSessionId;
      imagePrompt = result.actions.imagePrompt;
      updateMessage(localChatId, assistantMessageId, {
        content:
          result.reply ||
          streamedReply ||
          (imagePrompt ? t("chat.generatingImage") : "") ||
          t("chat.emptyResponse"),
      });
    } catch (err) {
      if (isInsufficientCreditsError(err)) {
        updateMessage(localChatId, assistantMessageId, {
          content: t("chat.noCreditsError"),
        });
        setUpgradeOpen(true);
      } else {
        updateMessage(localChatId, assistantMessageId, {
          content: t("chat.errorPrefix", {
            error: err instanceof Error ? err.message : t("chat.unknownError"),
          }),
        });
      }
    } finally {
      setIsSending(false);
      refetchSubInfo();
    }

    if (imagePrompt) {
      const imageMessageId = generateId();
      appendMessage(localChatId, {
        id: imageMessageId,
        role: "image",
        content: "",
        createdAt: new Date().toISOString(),
        image: { dataUrl: "", prompt: imagePrompt, loading: true },
      });
      setIsGeneratingImage(true);

      try {
        const image = await aiApi.generateImage(imagePrompt, imageSessionId);
        updateMessage(localChatId, imageMessageId, {
          image: {
            dataUrl: image.dataUrl,
            prompt: image.prompt || imagePrompt,
            loading: false,
          },
        });
      } catch (err) {
        if (isInsufficientCreditsError(err)) {
          updateMessage(localChatId, imageMessageId, {
            image: {
              dataUrl: "",
              prompt: imagePrompt,
              loading: false,
              error: t("chat.noCreditsError"),
            },
          });
          setUpgradeOpen(true);
        } else {
          updateMessage(localChatId, imageMessageId, {
            image: {
              dataUrl: "",
              prompt: imagePrompt,
              loading: false,
              error: err instanceof Error ? err.message : t("chat.unknownError"),
            },
          });
        }
      } finally {
        setIsGeneratingImage(false);
        refetchSubInfo();
      }
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearChatsStorage();
    queryClient.clear();
    navigate("/login");
  }

  return (
    <div className="student-app-frame flex h-dvh overflow-hidden bg-[#f4f5f6] p-2 text-neutral-950 lg:p-3">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        collapsed={sidebarCollapsed}
        userName={userName}
        userEmail={userEmail}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        activePanel={activePanel}
        onOpenPanel={setActivePanel}
        onSelectChat={(id) => {
          setActiveChatId(id);
          setActivePanel("chat");
        }}
        onDeleteChat={deleteChat}
        onNewChat={() => {
          startNewChat();
          setActivePanel("chat");
        }}
        onLogout={handleLogout}
        onOpenUpgrade={() => setUpgradeOpen(true)}
      />

      {activePanel === "analytics" ? (
        <section className="student-main-surface min-h-0 min-w-0 flex-1 flex flex-col bg-[#f8f9fa]">
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8 lg:px-10">
              <AnalyticsPage />
            </div>
          </div>
        </section>
      ) : (
        <section className="student-main-surface flex min-h-0 min-w-0 flex-1 flex-col bg-[#ffffff]">
          <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelMenuOpen((value) => !value)}
                className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-neutral-950  transition-colors hover:bg-neutral-50"
                aria-haspopup="menu"
                aria-expanded={modelMenuOpen}
              >
                {getModelTitle(selectedModel, t)}
                <ChevronDownIcon
                  className={`size-4 stroke-[2.25] text-neutral-500 transition-transform duration-200 ${
                    modelMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {modelMenuOpen && (
                  <ChatModelMenu
                    selectedModel={selectedModel}
                    onSelect={(model) => {
                      if ((model === "max" || model === "omni") && !isPro) {
                        setUpgradeOpen(true);
                      } else {
                        setSelectedModel(model);
                      }
                      setModelMenuOpen(false);
                    }}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
              {!isPro ? (
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="hidden h-10 items-center gap-1.5 rounded-full bg-[#6084ff] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4f73ef] sm:flex"
                >
                  <SparklesIcon className="size-4 stroke-[2]" />
                  {t("settings.account.upgrade")}
                </button>
              ) : (
                <div className="hidden h-10 items-center gap-1.5 rounded-full bg-neutral-100 px-4 text-sm font-semibold text-neutral-800 sm:flex">
                  <SparklesIcon className="size-4 stroke-[2] text-[#6084ff]" />
                  <span>{t("chat.modelProBadge")}</span>
                  {subInfo && (
                    <span className="ml-1 text-xs text-neutral-500">
                      ({subInfo.remainingCredits})
                    </span>
                  )}
                </div>
              )}
            </div>
          </header>

          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              {isEmpty ? (
                <motion.div
                  key="empty-welcome"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-20"
                >
                  {subInfo && (
                    <div className="mb-14 inline-flex h-11 items-center rounded-full bg-neutral-100 px-5 text-sm">
                      <span className="text-neutral-500">
                        {planLabel(subInfo.plan)}
                        {` (${subInfo.remainingCredits} ${t("settings.account.credits")})`}
                      </span>
                      {subInfo.plan === "FREE" && (
                        <>
                          <span
                            className="mx-4 h-5 w-px bg-neutral-300"
                            aria-hidden="true"
                          />
                          <button
                            type="button"
                            onClick={() => setUpgradeOpen(true)}
                            className="font-medium text-[#007aff] transition-colors hover:text-[#005fcc]"
                          >
                            {t("settings.account.upgrade")}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  <div className="w-full">
                    <h1 className="mb-10 text-center font-serif text-4xl font-normal tracking-tight text-neutral-950 sm:text-[42px]">
                      {t("chat.emptyTitle")}
                    </h1>
                    <motion.div
                      layoutId="composer-wrapper"
                      transition={{ type: "spring", stiffness: 380, damping: 33 }}
                      className="w-full"
                    >
                      <Composer
                        input={input}
                        loading={isSending || isGeneratingImage}
                        image={selectedImage}
                        onInput={setInput}
                        onImage={setSelectedImage}
                        onSubmit={send}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="chat-active"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <div className="min-h-0 flex-1 overflow-y-auto pb-28">
                    <MessageList
                      messages={messages}
                      loading={isSending}
                      userName={userName}
                    />
                  </div>
                  <motion.div
                    layoutId="composer-wrapper"
                    transition={{ type: "spring", stiffness: 380, damping: 33 }}
                    className="chat-gradient-mask absolute inset-x-0 bottom-0 px-4 pb-4 pt-14 sm:px-6 z-10"
                  >
                    <Composer
                      input={input}
                      loading={isSending || isGeneratingImage}
                      image={selectedImage}
                      onInput={setInput}
                      onImage={setSelectedImage}
                      onSubmit={send}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </section>
      )}
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => {
          setUpgradeOpen(false);
          refetchSubInfo();
        }}
      />
    </div>
  );
}
