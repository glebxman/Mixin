import { cn } from "../lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  variant?: "neutral" | "good" | "warn" | "bad" | "brand";
  size?: "sm" | "md" | "lg";
}

const variantMap = {
  neutral: "bg-neutral-800",
  brand: "bg-[#6084ff]",
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-[#e92554]",
} as const;

const trackVariantMap = {
  neutral: "bg-neutral-200",
  brand: "bg-[#6084ff]/15",
  good: "bg-emerald-100",
  warn: "bg-amber-100",
  bad: "bg-[#e92554]/15",
} as const;

const sizeMap = {
  sm: "h-2",
  md: "h-2.5",
  lg: "h-3",
} as const;

export function ProgressBar({
  value,
  max = 100,
  className,
  variant = "neutral",
  size = "md",
}: ProgressBarProps) {
  const safe = Math.max(0, Math.min(max, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "w-full overflow-hidden rounded-full",
        trackVariantMap[variant],
        sizeMap[size],
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          variantMap[variant],
        )}
        style={{ width: `${(safe / max) * 100}%` }}
      />
    </div>
  );
}

export function progressVariantForScore(
  score: number,
): ProgressBarProps["variant"] {
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}
