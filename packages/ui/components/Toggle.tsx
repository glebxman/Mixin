import * as React from "react";
import { cn } from "../lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  description,
  className,
}: ToggleProps) {
  const switchEl = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-neutral-900" : "bg-neutral-200",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 transform rounded-full bg-white transition-transform duration-200 ease-out",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );

  if (!label && !description) {
    return <div className={className}>{switchEl}</div>;
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-transparent px-1 py-1 transition-colors hover:border-neutral-100",
        className,
      )}
    >
      <div className="min-w-0">
        {label && <p className="text-sm font-medium text-neutral-900">{label}</p>}
        {description && <p className="text-xs text-neutral-500">{description}</p>}
      </div>
      {switchEl}
    </label>
  );
}
