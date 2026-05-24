import type { UniversityChance } from "@edtech/api-client";
import { useI18n } from "@edtech/i18n";
import { Card, CardContent, CardHeader, CardTitle, cn } from "@edtech/ui";
import { AcademicCapIcon } from "@heroicons/react/24/outline";

const chanceBadge = {
  high: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    bar: "bg-emerald-500",
  },
  medium: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    bar: "bg-amber-500",
  },
  low: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    bar: "bg-rose-500",
  },
} as const;

export function UniversityChancesCard({ items }: { items: UniversityChance[] }) {
  const { t } = useI18n();

  if (!items || items.length === 0) return null;

  // Sort: high first, then medium, then low
  const sorted = [...items].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.chance] - order[b.chance];
  });

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-0 top-0 -mr-8 -mt-8 size-32 rounded-full bg-indigo-100/30 dark:bg-indigo-900/10 blur-2xl" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AcademicCapIcon className="size-5 text-indigo-600 dark:text-indigo-400" />
          {t("analytics.universityChancesTitle")}
        </CardTitle>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t("analytics.universityChancesDesc")}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sorted.map((uni) => {
            const style = chanceBadge[uni.chance];
            return (
              <li
                key={uni.name}
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  style.border,
                  style.bg,
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                    {uni.name}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold",
                      style.text,
                      style.bg,
                    )}
                  >
                    {t(`analytics.chance.${uni.chance}`)}
                  </span>
                </div>
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-neutral-200/60 dark:bg-neutral-700/40">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", style.bar)}
                    style={{ width: `${Math.min(100, uni.score)}%` }}
                  />
                </div>
                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {uni.note}
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
