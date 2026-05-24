import type { ReactNode } from "react";
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { Avatar } from "@edtech/ui";
import { useI18n } from "@edtech/i18n";
import type { SidebarIcon } from "@/components/chat/sidebar/types";

export function ProfileMenu({
  userName,
  onOpenProfile,
  onLogout,
  onOpenSettings,
}: {
  userName: string;
  onOpenProfile: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      role="menu"
      className="absolute bottom-[70px] left-3 right-3 z-30 rounded-[28px] border border-white/80 bg-white p-2 "
    >
      <div className="flex items-center gap-3 rounded-[22px] bg-[#f2f4f5] px-3 py-3">
        <Avatar name={userName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-5 text-neutral-950">{userName}</p>
          <p className="text-xs leading-4 text-neutral-500">{t("chat.mixinAccount")}</p>
        </div>
      </div>
      <div className="my-1" />
      <ProfileMenuButton
        icon={UserCircleIcon}
        label={t("common.profile")}
        onClick={onOpenProfile}
      />
      <ProfileMenuButton
        icon={Cog6ToothIcon}
        label={t("common.settings")}
        onClick={onOpenSettings}
      />
      <div className="my-1 border-t border-neutral-100" />
      <ProfileMenuButton
        icon={ArrowRightOnRectangleIcon}
        label={t("common.logout")}
        onClick={onLogout}
      />
    </div>
  );
}

function ProfileMenuButton({
  icon: Icon,
  label,
  trailing,
  onClick,
}: {
  icon: SidebarIcon;
  label: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex h-10 w-full items-center gap-3 rounded-full px-3 text-left text-sm text-neutral-950 transition-colors hover:bg-neutral-100"
    >
      <Icon className="size-[18px] shrink-0 stroke-[1.8]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}
