import { useI18n } from "@edtech/i18n";

export function PlaceholderPanel({ sectionKey }: { sectionKey: string }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center">
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium text-neutral-700">
          {t(`settings.nav.${sectionKey}`)}
        </p>
        <p className="mt-1 text-xs text-neutral-500">{t("common.comingSoon")}</p>
      </div>
    </div>
  );
}
