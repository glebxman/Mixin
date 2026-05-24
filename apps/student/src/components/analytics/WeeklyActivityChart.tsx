import { useI18n } from "@edtech/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@edtech/ui";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import type { WeeklyActivity } from "@edtech/api-client";

const WEEKDAY_MAP: Record<string, string> = {
  "Пн": "weekdays.mon",
  "Mon": "weekdays.mon",
  "Du": "weekdays.mon",
  "Вт": "weekdays.tue",
  "Tue": "weekdays.tue",
  "Se": "weekdays.tue",
  "Ср": "weekdays.wed",
  "Wed": "weekdays.wed",
  "Ch": "weekdays.wed",
  "Чт": "weekdays.thu",
  "Thu": "weekdays.thu",
  "Pa": "weekdays.thu",
  "Пт": "weekdays.fri",
  "Fri": "weekdays.fri",
  "Ju": "weekdays.fri",
  "Сб": "weekdays.sat",
  "Sat": "weekdays.sat",
  "Sh": "weekdays.sat",
  "Вс": "weekdays.sun",
  "Sun": "weekdays.sun",
  "Ya": "weekdays.sun",
};

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
          <CalendarDaysIcon className="size-5 text-[#6084ff]" />
          {t("analytics.weeklyActivityTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[180px] items-end justify-between gap-3">
          {items.map((item) => {
            const height = max > 0 ? (item.minutes / max) * 140 : 0;
            return (
              <div key={item.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <p className="text-xs font-semibold text-neutral-700">
                  {t("analytics.weeklyActivityMin", { minutes: item.minutes })}
                </p>
                <div
                  className="w-full rounded-lg bg-neutral-800 transition-all duration-300"
                  style={{ height: `${Math.max(4, height)}px` }}
                />
                <p className="max-w-full truncate text-xs font-medium text-neutral-500">
                  {t(WEEKDAY_MAP[item.day] || item.day)}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
