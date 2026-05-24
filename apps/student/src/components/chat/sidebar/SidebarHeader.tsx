import {
  MagnifyingGlassIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";
import { useI18n } from "@edtech/i18n";
import logoBlack from "@/assets/logo_black.svg";

export function SidebarHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();

  if (collapsed) {
    return (
      <div className="flex h-16 shrink-0 items-center justify-center">
        <button
          type="button"
          onClick={onToggle}
          className="grid size-11 place-items-center rounded-full bg-white transition-colors hover:bg-neutral-100"
          aria-label={t("aria.menuExpand")}
        >
          <img src={logoBlack} alt="Mixin" className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-16 shrink-0 items-center justify-between px-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 items-center gap-2 rounded-full py-1 pr-2 text-left transition-colors hover:bg-neutral-100"
        aria-label={t("aria.menuCollapse")}
      >
        <img src={logoBlack} alt="Mixin" className="size-5" />
        <span className="font-serif text-xl font-semibold leading-none tracking-tight">
          mixin
        </span>
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="grid size-10 place-items-center rounded-full bg-white text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
          aria-label={t("aria.menuCollapse")}
        >
          <RectangleGroupIcon className="size-5 stroke-[1.8]" />
        </button>
      </div>
    </div>
  );
}
