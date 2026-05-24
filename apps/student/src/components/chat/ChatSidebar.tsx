import { useEffect, useState } from "react";
import { cn } from "@edtech/ui";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { SidebarHeader } from "@/components/chat/sidebar/SidebarHeader";
import { SidebarMainNav } from "@/components/chat/sidebar/SidebarMainNav";
import { SidebarHistory } from "@/components/chat/sidebar/SidebarHistory";
import { SidebarFooter } from "@/components/chat/sidebar/SidebarFooter";
import type {
  ChatSidebarProps,
  SettingsSection,
} from "@/components/chat/sidebar/types";

export type { ChatSidebarProps } from "@/components/chat/sidebar/types";

export function ChatSidebar({
  chats,
  activeChatId,
  collapsed,
  userName,
  userEmail,
  onToggleCollapsed,
  activePanel,
  onOpenPanel,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  onLogout,
  onOpenUpgrade,
}: ChatSidebarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("general");

  useEffect(() => {
    if (collapsed) setProfileOpen(false);
  }, [collapsed]);

  return (
    <>
      <aside
        className={cn(
          "relative mr-2 hidden h-full shrink-0 flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[#ffffff] text-neutral-950  transition-[width] duration-300 ease-out lg:flex",
          collapsed ? "w-[64px]" : "w-[300px]",
        )}
      >
        <SidebarHeader collapsed={collapsed} onToggle={onToggleCollapsed} />
        <SidebarMainNav
          collapsed={collapsed}
          activePanel={activePanel}
          onNewChat={onNewChat}
          onOpenPanel={onOpenPanel}
        />

        {!collapsed && (
          <SidebarHistory
            chats={chats}
            activeChatId={activeChatId}
            onSelect={onSelectChat}
            onDelete={onDeleteChat}
          />
        )}

        <SidebarFooter
          collapsed={collapsed}
          profileOpen={profileOpen}
          userName={userName}
          onToggleProfile={() => setProfileOpen((value) => !value)}
          onOpenSettings={() => {
            setProfileOpen(false);
            setSettingsSection("general");
            setSettingsOpen(true);
          }}
          onOpenProfile={() => {
            setProfileOpen(false);
            setSettingsSection("account");
            setSettingsOpen(true);
          }}
          onLogout={() => {
            setProfileOpen(false);
            onLogout();
          }}
        />
      </aside>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialSection={settingsSection}
        userName={userName}
        userEmail={userEmail}
        onUpgradeClick={() => {
          setSettingsOpen(false);
          onOpenUpgrade();
        }}
      />
    </>
  );
}
