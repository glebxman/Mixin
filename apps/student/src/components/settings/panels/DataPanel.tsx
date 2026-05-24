import { useI18n } from "@edtech/i18n";

export function DataPanel() {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-3 text-base font-semibold text-neutral-950">
          {t("settings.data.title")}
        </h3>
        <p className="text-sm text-neutral-500">{t("settings.data.desc")}</p>
      </section>
    </div>
  );
}
