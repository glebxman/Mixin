import { useI18n } from "@edtech/i18n";
import { Section, cn } from "@edtech/ui";
import { CheckIcon } from "@heroicons/react/24/outline";

const CAREER = [
  "IT / Программирование",
  "Медицина",
  "Инженерия",
  "Экономика / Бизнес",
  "Юриспруденция",
  "Образование",
  "Искусство / Дизайн",
  "Наука / Исследования",
];

const DIRECTION_MAP: Record<string, string> = {
  "IT / Программирование": "directions.it",
  "Медицина": "directions.medicine",
  "Инженерия": "directions.engineering",
  "Экономика / Бизнес": "directions.business",
  "Юриспруденция": "directions.law",
  "Образование": "directions.education",
  "Искусство / Дизайн": "directions.design",
  "Наука / Исследования": "directions.science",
};

export function CareerSection({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (next: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Section
      title={t("profile.careerTitle")}
      description={t("profile.careerDesc")}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {CAREER.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
              )}
            >
              <span className="font-medium">{t(DIRECTION_MAP[option] || option)}</span>
              {active && <CheckIcon className="size-4" />}
            </button>
          );
        })}
      </div>
    </Section>
  );
}
