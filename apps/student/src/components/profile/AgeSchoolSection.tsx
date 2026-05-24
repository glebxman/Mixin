import { useI18n } from "@edtech/i18n";
import { Input, Section } from "@edtech/ui";

export function AgeSchoolSection({
  age,
  schoolName,
  onAgeChange,
  onSchoolChange,
}: {
  age: number | undefined;
  schoolName: string | undefined;
  onAgeChange: (next: number | undefined) => void;
  onSchoolChange: (next: string | undefined) => void;
}) {
  const { t } = useI18n();
  return (
    <Section title={t("profile.ageSchoolTitle")}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            {t("profile.ageLabel")}
          </label>
          <Input
            type="number"
            min={5}
            max={20}
            value={age ?? ""}
            onChange={(e) =>
              onAgeChange(e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            placeholder={t("profile.agePlaceholder")}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            {t("profile.schoolLabel")}
          </label>
          <Input
            value={schoolName ?? ""}
            onChange={(e) => onSchoolChange(e.target.value || undefined)}
            placeholder={t("profile.schoolPlaceholder")}
          />
        </div>
      </div>
    </Section>
  );
}
