import { Section, cn } from "@edtech/ui";
import type { Grade } from "@edtech/types";

import { useI18n } from "@edtech/i18n";

const GRADES: Array<{ value: Grade; label: string }> = Array.from(
  { length: 11 },
  (_, i) => ({ value: `G${i + 1}` as Grade, label: `${i + 1}` }),
);

export function GradeSection({
  grade,
  onChange,
}: {
  grade: Grade;
  onChange: (next: Grade) => void;
}) {
  const { t } = useI18n();
  return (
    <Section title={t("profile.gradeTitle")} description={t("profile.gradeDesc")}>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
        {GRADES.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => onChange(g.value)}
            className={cn(
              "h-11 rounded-xl border text-sm font-semibold transition",
              grade === g.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
    </Section>
  );
}
