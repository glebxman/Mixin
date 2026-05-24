import { useI18n } from "@edtech/i18n";
import { Card, CardContent, CardHeader, CardTitle, ProgressBar } from "@edtech/ui";
import { TrophyIcon } from "@heroicons/react/24/outline";
import type { StudentAnalytics } from "@edtech/api-client";

export function LevelCard({ analytics }: { analytics: StudentAnalytics }) {
  const total = analytics.xp + analytics.xpToNextLevel;
  const percent = total > 0 ? (analytics.xp / total) * 100 : 0;
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="size-5 text-amber-500" />
          {t("analytics.levelCardTitle", { level: analytics.level })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-neutral-950">{analytics.xp} XP</p>
        <p className="mt-1 text-xs text-neutral-500">
          {t("analytics.levelCardNext", { xp: analytics.xpToNextLevel })}
        </p>
        <ProgressBar value={percent} className="mt-3" />
      </CardContent>
    </Card>
  );
}
