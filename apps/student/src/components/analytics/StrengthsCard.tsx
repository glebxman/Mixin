import { useI18n } from "@edtech/i18n";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@edtech/ui";
import { CheckBadgeIcon } from "@heroicons/react/24/outline";

export function StrengthsCard({ items }: { items: string[] }) {
  const { t } = useI18n();
  return (
    <Card className="bg-emerald-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckBadgeIcon className="size-5 text-emerald-600" />
          {t("analytics.strengthsTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title={t("analytics.strengthsEmpty")}
            description={t("analytics.strengthsEmptyDesc")}
            icon={CheckBadgeIcon}
          />
        ) : (
          <ul className="space-y-2 text-sm text-neutral-800">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-600" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
