import { cn } from "../lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** ARIA label for screen readers. Pass a localised string from the calling app. */
  "aria-label"?: string;
}

const sizeMap = {
  sm: "size-3.5 border-2",
  md: "size-4 border-2",
  lg: "size-5 border-[2.5px]",
} as const;

export function Spinner({
  size = "md",
  className,
  "aria-label": ariaLabel,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent",
        sizeMap[size],
        className,
      )}
    />
  );
}
