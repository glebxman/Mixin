import type { ComponentType, SVGProps } from "react";
import type { ChatSession } from "@/hooks/useChats";

export type SidebarIcon = ComponentType<SVGProps<SVGSVGElement>>;
export type SettingsSection = "account" | "general";
export type WorkspacePanel = "chat" | "analytics";

export type ChatSidebarProps = {
  chats: ChatSession[];
  activeChatId: string | null;
  collapsed: boolean;
  userName: string;
  userEmail?: string;
  onToggleCollapsed: () => void;
  activePanel: WorkspacePanel;
  onOpenPanel: (panel: WorkspacePanel) => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
  onOpenUpgrade: () => void;
};
