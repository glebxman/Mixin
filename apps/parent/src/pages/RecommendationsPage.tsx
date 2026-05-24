import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parentApi } from "@edtech/api-client";
import { EmptyState, ErrorState, LoadingState } from "@edtech/ui";
import {
  AcademicCapIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  HeartIcon,
  LightBulbIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const categoryMeta: Record<string, { label: string; icon: typeof LightBulbIcon }> = {
  learning: { label: "Обучение", icon: AcademicCapIcon },
  career: { label: "Карьера", icon: BriefcaseIcon },
  health: { label: "Здоровье", icon: HeartIcon },
};

const priorityLabel = {
  high: "Высокий приоритет",
  medium: "Средний приоритет",
  low: "Низкий приоритет",
} as const;

const priorityTone = {
  high: "bg-[#ffe9e1] text-[#f15d2a]",
  medium: "bg-[#fff5d8] text-[#8a6b00]",
  low: "bg-[#e8f8ef] text-[#089567]",
} as const;

export function RecommendationsPage() {
  const query = useQuery({
    queryKey: ["parent", "recommendations"],
    queryFn: () => parentApi.recommendations(),
  });
  const [active, setActive] = useState<string | null>(null);

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={(query.error as Error).message} />;
  if (!query.data || query.data.length === 0) {
    return (
      <EmptyState
        title="Рекомендаций пока нет"
        description="AI готовит советы. Попробуйте позже."
        icon={LightBulbIcon}
      />
    );
  }

  const groups = query.data;
  const current = groups.find((group) => group.category === active) ?? groups[0];
  const currentMeta = categoryMeta[current.category] ?? {
    label: current.category,
    icon: LightBulbIcon,
  };

  return (
    <section className="overflow-hidden rounded-[34px] border border-[#d9d9d1] bg-[#eeeee5]">
      <div className="bg-[#3d3e3a] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-[26px] bg-[#eeeee5] px-8 py-4">
            <h1 className="text-2xl font-semibold tracking-normal text-[#151614]">
              Рекомендации
            </h1>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {groups.map((group) => {
              const meta = categoryMeta[group.category] ?? {
                label: group.category,
                icon: LightBulbIcon,
              };
              const Icon = meta.icon;
              const isActive = current.category === group.category;
              return (
                <button
                  key={group.category}
                  type="button"
                  onClick={() => setActive(group.category)}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-[#1f201d]"
                      : "bg-[#f2f2ec] text-[#555651] hover:bg-white"
                  }`}
                >
                  <Icon className="size-4" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-[28px] bg-white p-6 shadow-[0_18px_35px_rgba(37,38,34,0.05)]">
            <div className="grid size-20 place-items-center rounded-[24px] bg-[#f2ff19] text-[#252621] shadow-[0_0_24px_rgba(242,255,25,0.5)]">
              <SparklesIcon className="size-9" />
            </div>
            <p className="mt-5 text-xs font-medium uppercase text-[#77786f]">AI модуль</p>
            <h2 className="mt-1 text-xl font-semibold text-[#151614]">Семейный план</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#666760]">
              Советы обновляются по прогрессу, интересам и учебному ритму ребёнка.
            </p>
          </aside>

          <div className="rounded-[28px] bg-[#f5f5ed] p-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-medium uppercase text-[#77786f]">AI</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-normal text-[#11120f]">
                  {currentMeta.label}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#686963]">
                  Персональные рекомендации на основе анализа успеваемости и интересов ребёнка.
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-3 gap-5 sm:min-w-[360px]">
                <Metric label="Разделы" value={groups.length.toString()} />
                <Metric
                  label="Советы"
                  value={groups.reduce((sum, group) => sum + group.items.length, 0).toString()}
                />
                <Metric label="Фокус" value={currentMeta.label} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="grid gap-5 md:grid-cols-2">
            {current.items.map((rec, index) => (
              <article
                key={`${rec.title}-${index}`}
                className="rounded-[28px] bg-white p-6 shadow-[0_18px_35px_rgba(37,38,34,0.05)]"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold leading-snug text-[#151614]">
                      {rec.title}
                    </h3>
                    <span
                      className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityTone[rec.priority]}`}
                    >
                      {priorityLabel[rec.priority]}
                    </span>
                  </div>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f2f2ec] text-[#555651]">
                    <LightBulbIcon className="size-5" />
                  </span>
                </div>

                <div className="rounded-[22px] bg-[#ededdf] p-5">
                  <div className="mb-4 h-1 rounded-full bg-[#f2ff19]" />
                  <p className="text-sm leading-relaxed text-[#555651]">
                    {rec.description}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <aside className="space-y-5">
            <SummaryPanel groups={groups} activeLabel={currentMeta.label} />
            <StepsPanel items={current.items.map((item) => item.title)} />
          </aside>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#77786f]">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold text-[#11120f]">{value}</p>
    </div>
  );
}

function SummaryPanel({
  groups,
  activeLabel,
}: {
  groups: Array<{ category: string; items: unknown[] }>;
  activeLabel: string;
}) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_18px_35px_rgba(37,38,34,0.05)]">
      <div className="mb-5 flex items-center gap-2">
        <CheckCircleIcon className="size-5 text-[#089567]" />
        <h2 className="text-lg font-semibold text-[#151614]">Сводка</h2>
      </div>

      <div className="space-y-3 text-sm text-[#555651]">
        <div className="flex items-center justify-between rounded-2xl bg-[#f3f3ed] px-4 py-3">
          <span>Активный фокус</span>
          <span className="font-semibold text-[#151614]">{activeLabel}</span>
        </div>
        {groups.map((group) => {
          const meta = categoryMeta[group.category] ?? {
            label: group.category,
            icon: LightBulbIcon,
          };
          return (
            <div
              key={group.category}
              className="flex items-center justify-between rounded-2xl bg-[#f8f8f2] px-4 py-3"
            >
              <span>{meta.label}</span>
              <span className="font-semibold text-[#151614]">{group.items.length}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepsPanel({ items }: { items: string[] }) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_18px_35px_rgba(37,38,34,0.05)]">
      <div className="mb-5 flex items-center gap-2">
        <SparklesIcon className="size-5 text-[#555651]" />
        <h2 className="text-lg font-semibold text-[#151614]">Ближайшие шаги</h2>
      </div>

      <ul className="space-y-3 text-sm text-[#555651]">
        {items.slice(0, 4).map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#f2ff19] text-xs font-semibold text-[#252621]">
              {index + 1}
            </span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
