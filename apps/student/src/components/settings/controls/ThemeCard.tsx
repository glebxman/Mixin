import { cn } from "@edtech/ui";
import type { SettingsIcon } from "@/components/settings/nav";

export function ThemeCard({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: SettingsIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border bg-white py-4 transition-all",
        active
          ? "border-neutral-900 "
          : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
      )}
    >
      <Icon className="size-5 text-neutral-700" />
      <span className="text-sm text-neutral-900">{label}</span>
    </button>
  );
}
