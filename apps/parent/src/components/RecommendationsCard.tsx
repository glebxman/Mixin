import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@edtech/ui";
import { LightBulbIcon } from "@heroicons/react/24/outline";
import type { Recommendation } from "@edtech/api-client";
import { useI18n } from "@edtech/i18n";

const tone = {
  high: "border-l-rose-500 bg-rose-50/80",
  medium: "border-l-amber-500 bg-amber-50/80",
  low: "border-l-emerald-500 bg-emerald-50/80",
} as const;

const priorityDot = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
} as const;

export function RecommendationsCard({ items }: { items: Recommendation[] }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LightBulbIcon className="size-5 text-amber-500" />
          {t("parent.recommendations")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title={t("parent.recommendationsEmptyTitle")}
            description={t("parent.recommendationsEmptyDesc")}
            icon={LightBulbIcon}
          />
        ) : (
          <ul className="space-y-3">
            {items.map((rec, index) => (
              <li
                key={`${rec.title}-${index}`}
                className={`rounded-xl border-l-4 p-4 ${tone[rec.priority]}`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={`size-2 rounded-full ${priorityDot[rec.priority]}`} />
                  <p className="text-sm font-semibold text-neutral-900">{rec.title}</p>
                </div>
                <p className="pl-4 text-xs leading-relaxed text-neutral-600">
                  {rec.description}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
