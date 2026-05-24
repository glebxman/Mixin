import {
  Cog6ToothIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";
import { Avatar } from "@edtech/ui";
import { useI18n } from "@edtech/i18n";
import { ProfileMenu } from "@/components/chat/sidebar/ProfileMenu";

export function SidebarFooter({
  collapsed,
  profileOpen,
  userName,
  onToggleProfile,
  onOpenProfile,
  onOpenSettings,
  onLogout,
}: {
  collapsed: boolean;
  profileOpen: boolean;
  userName: string;
  onToggleProfile: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  const { t } = useI18n();

  if (collapsed) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-2 border-t border-neutral-200/70 px-2 py-3">
        <button
          className="grid size-11 place-items-center rounded-full hover:bg-neutral-100"
          type="button"
        >
          <RectangleGroupIcon className="size-5 stroke-[1.8]" />
        </button>
        <button
          className="grid size-11 place-items-center rounded-full hover:bg-neutral-100"
          type="button"
          onClick={onOpenSettings}
          aria-label={t("aria.openSettings")}
        >
          <Cog6ToothIcon className="size-5 stroke-[1.8]" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative p-3">
      {profileOpen && (
        <ProfileMenu
          userName={userName}
          onOpenProfile={onOpenProfile}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
        />
      )}
      <button
        type="button"
        onClick={onToggleProfile}
        className="flex h-[54px] w-full items-center gap-3 rounded-full bg-white px-3 text-left transition-colors hover:bg-neutral-100"
        aria-haspopup="menu"
        aria-expanded={profileOpen}
      >
        <Avatar name={userName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-5">{userName}</p>
          <p className="text-xs leading-4 text-neutral-500">{t("chat.fromMixin")}</p>
        </div>
      </button>
    </div>
  );
}
