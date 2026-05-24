import { SparklesIcon } from "@heroicons/react/24/solid";
import { cn } from "../lib/utils";

/**
 * Brand — единый логотип Mixin для всех 4 панелей.
 * Цвет акцента можно переопределить (например emerald для student/parent,
 * violet для school, neutral для admin), но форма и масштаб одинаковые.
 */
type BrandVariant = "neutral" | "emerald" | "violet" | "blue";

const variantStyles: Record<BrandVariant, string> = {
  neutral: "bg-neutral-900 text-white",
  emerald: "bg-emerald-600 text-white",
  violet: "bg-violet-600 text-white",
  blue: "bg-[#6084ff] text-white",
};

interface BrandProps {
  /** Подпись справа от логотипа. Если undefined — только лого. */
  label?: string;
  /** Цветовая вариация для разных панелей. */
  variant?: BrandVariant;
  className?: string;
}

export function Brand({ label = "Mixin", variant = "neutral", className }: BrandProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <span
        className={cn(
          "grid size-7 place-items-center rounded-lg transition-transform group-hover:scale-105",
          variantStyles[variant],
        )}
      >
        <SparklesIcon className="size-4" />
      </span>
      {label && <span className="text-base text-neutral-950">{label}</span>}
    </span>
  );
}
