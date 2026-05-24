import { Card, CardContent, CardHeader, CardTitle } from "@edtech/ui";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import type { WeeklyActivity } from "@edtech/api-client";
import { useI18n } from "@edtech/i18n";

export function WeeklyActivityChart({
  items,
  max,
}: {
  items: WeeklyActivity[];
  max: number;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDaysIcon className="size-5 text-blue-500" />
          {t("parent.weeklyActivity")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3" style={{ height: 180 }}>
          {items.map((item) => {
            const height = max > 0 ? (item.minutes / max) * 140 : 0;
            return (
              <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                <p className="text-xs font-semibold text-neutral-700">
                  {t("analytics.weeklyActivityMin", { minutes: item.minutes })}
                </p>
                <div
                  className="w-full rounded-lg bg-neutral-800 transition-all duration-300"
                  style={{ height: `${Math.max(4, height)}px` }}
                />
                <p className="text-xs font-medium text-neutral-500">{item.day}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
