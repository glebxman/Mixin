import {
  ArrowTopRightOnSquareIcon,
  ChevronUpDownIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { Avatar, cn } from "@edtech/ui";
import { useI18n } from "@edtech/i18n";
import {
  SETTINGS_NAV_GROUPS,
  type SettingsIcon,
  type SettingsSection,
} from "@/components/settings/nav";

export function SettingsSidebar({
  active,
  onSelect,
  userName,
  userEmail,
}: {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
  userName: string;
  userEmail?: string;
}) {
  const { t } = useI18n();
  return (
    <aside className="flex w-[252px] shrink-0 flex-col bg-white px-3 py-4">
      <button
        type="button"
        className="mb-4 flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-neutral-100"
      >
        <Avatar name={userName} size="sm" />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium leading-5 text-neutral-950">
            {userName}
          </p>
          <p className="truncate text-xs leading-4 text-neutral-500">
            {userEmail || t("settings.account.personalScope")}
          </p>
        </div>
        <ChevronUpDownIcon className="size-4 shrink-0 text-neutral-400" />
      </button>

      <nav className="flex-1 space-y-4 overflow-y-auto">
        {SETTINGS_NAV_GROUPS.map((group) => (
          <div key={group.titleKey}>
            <p className="mb-1 px-3 text-xs text-neutral-400">{t(group.titleKey)}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  active={active === item.id}
                  onClick={() => onSelect(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-3 pt-3">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
        >
          <QuestionMarkCircleIcon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 text-left">{t("settings.nav.help")}</span>
          <ArrowTopRightOnSquareIcon className="size-3.5 shrink-0 text-neutral-400" />
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: SettingsIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-neutral-100 text-neutral-950"
          : "text-neutral-700 hover:bg-neutral-50",
      )}
    >
      <Icon className="size-4 shrink-0 stroke-[1.8]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}
