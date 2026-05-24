import { useEffect, useState } from "react";
import { RectangleGroupIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@edtech/i18n";
import logoBlack from "@/assets/logo_black.svg";
import logoLight from "@/assets/logo_light.svg";

export function SidebarHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();

  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    setIsDark(document.documentElement.classList.contains("dark"));

    return () => observer.disconnect();
  }, []);

  const logoSrc = isDark ? logoLight : logoBlack;

  if (collapsed) {
    return (
      <div className="flex h-16 shrink-0 items-center justify-center">
        <div
          onClick={onToggle}
          className="grid size-11 place-items-center rounded-full bg-transparent cursor-pointer select-none outline-none"
          role="button"
          tabIndex={0}
          aria-label={t("aria.menuExpand")}
        >
          <img src={logoSrc} alt="Mixin" className="size-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-16 shrink-0 items-center justify-between px-4">
      <div
        onClick={onToggle}
        className="flex min-w-0 items-center gap-2 rounded-full py-1 pr-2 text-left cursor-pointer select-none outline-none"
        role="button"
        tabIndex={0}
        aria-label={t("aria.menuCollapse")}
      >
        <img src={logoSrc} alt="Mixin" className="size-5" />
        <span className="font-serif text-xl font-semibold leading-none tracking-tight">
          mixin
        </span>
      </div>
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
