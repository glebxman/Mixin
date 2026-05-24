import * as React from "react";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { cn } from "../lib/utils";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: IconType;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  iconAccent?: "neutral" | "emerald" | "blue" | "violet" | "orange" | "rose";
}

const accentMap = {
  neutral: "bg-neutral-950 text-white",
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-[#6084ff]/10 text-[#6084ff]",
  violet: "bg-violet-50 text-violet-600",
  orange: "bg-orange-50 text-orange-600",
  rose: "bg-[#e92554]/10 text-[#e92554]",
} as const;

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  trendValue,
  iconAccent = "neutral",
  className,
  ...rest
}: StatProps) {
  return (
    <div
      className={cn(
        "card-hover rounded-[28px] border border-white/80 bg-white p-6 ",
        className,
      )}
      {...rest}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "grid size-12 place-items-center rounded-2xl transition-transform duration-200",
              accentMap[iconAccent],
            )}
          >
            <Icon className="size-5" />
          </div>
        )}
      </div>
      {(hint || trend) && (
        <div className="mt-4 flex items-center gap-1 text-sm">
          {trend === "up" && <ArrowTrendingUpIcon className="size-4 text-emerald-600" />}
          {trend === "down" && (
            <ArrowTrendingDownIcon className="size-4 text-[#e92554]" />
          )}
          {trendValue && (
            <span
              className={cn(
                "font-medium",
                trend === "up" && "text-emerald-600",
                trend === "down" && "text-[#e92554]",
                !trend && "text-neutral-700",
              )}
            >
              {trendValue}
            </span>
          )}
          {hint && <span className="text-neutral-500">{hint}</span>}
        </div>
      )}
    </div>
  );
}
