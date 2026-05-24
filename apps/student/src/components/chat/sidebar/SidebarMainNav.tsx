import {
  BookOpenIcon,
  ChartBarIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@edtech/ui";
import { useI18n } from "@edtech/i18n";
import type { SidebarIcon, WorkspacePanel } from "@/components/chat/sidebar/types";

type NavItem = {
  icon: SidebarIcon;
  labelKey: string;
  panel?: WorkspacePanel;
  badgeKey?: string;
};

const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { icon: PencilSquareIcon, labelKey: "nav.newTask", panel: "chat" },
  { icon: ChartBarIcon, labelKey: "nav.analytics", panel: "analytics" },
  { icon: ClockIcon, labelKey: "nav.scheduled", badgeKey: "chat.badgeNew" },
  { icon: BookOpenIcon, labelKey: "nav.library" },
];

export function SidebarMainNav({
  collapsed,
  activePanel,
  onNewChat,
  onOpenPanel,
}: {
  collapsed: boolean;
  activePanel: WorkspacePanel;
  onNewChat: () => void;
  onOpenPanel: (panel: WorkspacePanel) => void;
}) {
  const { t } = useI18n();

  const handleClick = (item: NavItem) => {
    if (item.panel === "chat") {
      onNewChat();
    } else if (item.panel) {
      onOpenPanel(item.panel);
    }
  };

  if (collapsed) {
    return (
      <nav className="flex flex-1 flex-col items-center gap-3 px-2 pt-2">
        {PRIMARY_NAV.map((item) => (
          <button
            key={item.labelKey}
            type="button"
            onClick={() => handleClick(item)}
            className={cn(
              "grid size-11 place-items-center rounded-full text-neutral-800 transition-colors hover:bg-neutral-100",
              item.panel === "analytics" &&
                activePanel === "analytics" &&
                "bg-neutral-950 text-white hover:bg-neutral-800",
            )}
            aria-label={t(item.labelKey)}
          >
            <item.icon className="size-5 stroke-[1.8]" />
          </button>
        ))}
        <button
          type="button"
          className="mt-2 grid size-11 place-items-center rounded-full text-neutral-800 transition-colors hover:bg-neutral-100"
          aria-label={t("aria.search")}
        >
          <MagnifyingGlassIcon className="size-5 stroke-[1.8]" />
        </button>
      </nav>
    );
  }

  return (
    <nav className="space-y-2 px-3">
      {PRIMARY_NAV.map((item) => (
        <SidebarAction
          key={item.labelKey}
          active={item.panel === "analytics" && activePanel === "analytics"}
          icon={item.icon}
          label={t(item.labelKey)}
          badge={item.badgeKey ? t(item.badgeKey) : undefined}
          onClick={() => handleClick(item)}
        />
      ))}
    </nav>
  );
}

function SidebarAction({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active?: boolean;
  icon: SidebarIcon;
  label: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center gap-3 rounded-full px-4 text-sm text-neutral-700 transition-all hover:bg-neutral-100 hover:text-neutral-950",
        active && "bg-neutral-950 text-white",
      )}
    >
      <Icon className="size-[18px] shrink-0 stroke-[1.8]" />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {badge && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            active
              ? "bg-white/15 text-white"
              : "bg-[#6084ff]/10 text-[#6084ff]",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
