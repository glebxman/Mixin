import { useI18n } from "@edtech/i18n";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@edtech/ui";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

export function WeaknessesCard({ items }: { items: string[] }) {
  const { t } = useI18n();
  return (
    <Card className="bg-[#e92554]/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ExclamationCircleIcon className="size-5 text-[#e92554]" />
          {t("analytics.weaknessesTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title={t("analytics.weaknessesEmpty")}
            description={t("analytics.weaknessesEmptyDesc")}
            icon={ExclamationCircleIcon}
          />
        ) : (
          <ul className="space-y-2 text-sm text-neutral-800">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#e92554]" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
