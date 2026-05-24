import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { parentApi } from "@edtech/api-client";
import { ErrorState, LoadingState } from "@edtech/ui";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  BeakerIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  LightBulbIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

const tabs = [
  { label: "Динамика", icon: ChartBarIcon },
  { label: "Визиты", icon: CalendarDaysIcon },
  { label: "Предметы", icon: BookOpenIcon },
  { label: "Квесты", icon: AcademicCapIcon },
  { label: "AI", icon: LightBulbIcon },
];

export function ChildPage() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["parent", "child", id],
    queryFn: () => parentApi.childOverview(id!),
    enabled: !!id,
  });

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={(query.error as Error).message} />;
  if (!query.data) return null;

  const { child, analytics } = query.data;
  const fullName = `${child.firstName} ${child.lastName}`.trim();
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="overflow-hidden rounded-[34px] border border-[#d9d9d1] bg-[#eeeee5]">
      <div className="bg-[#3d3e3a] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="grid size-12 place-items-center rounded-full bg-[#f2f2ec] text-[#555651] transition hover:bg-white"
            aria-label="На главную"
          >
            <ArrowLeftIcon className="size-5" />
          </Link>

          <div className="rounded-[26px] bg-[#eeeee5] px-8 py-4">
            <h1 className="text-2xl font-semibold tracking-normal text-[#151614]">
              {fullName}
            </h1>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <span
                  key={tab.label}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${
                    index === 0
                      ? "bg-white text-[#1f201d]"
                      : "bg-[#f2f2ec] text-[#555651]"
                  }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8">
        <div className="mb-6 grid gap-6 xl:grid-cols-[260px_1fr]">
          <aside className="rounded-[28px] bg-white p-6 shadow-[0_18px_35px_rgba(37,38,34,0.05)]">
            <div className="grid size-20 place-items-center rounded-[24px] bg-[#f0e2d8] text-3xl font-semibold text-[#343431]">
              {initials}
            </div>
            <p className="mt-5 text-xs font-medium uppercase text-[#77786f]">Ученик</p>
            <h2 className="mt-1 text-xl font-semibold text-[#151614]">{fullName}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#666760]">
              {child.grade} • {child.schoolName ?? "Школа не указана"}
            </p>
          </aside>

          <div className="rounded-[28px] bg-[#f5f5ed] p-6">
            <Link
              to="/"
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#555651] hover:text-[#1f201d]"
            >
              <ArrowLeftIcon className="size-4" />
              На главную
            </Link>

            <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-medium uppercase text-[#77786f]">Диагноз</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-normal text-[#11120f]">
                  {fullName}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#686963]">
                  {child.grade} • {child.schoolName ?? "Школа не указана"}
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-5 sm:min-w-[520px] sm:grid-cols-4">
                <Metric label="Уровень" value={child.level.toString()} />
                <Metric label="Очки опыта" value={child.xp.toString()} />
                <Metric label="Прогресс" value={`${analytics.overallProgress}%`} />
                <Metric label="Серия" value={`${child.streakDays}д`} />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-5 lg:grid-cols-3">
          <SoftMetric
            label="Уровень"
            value={child.level.toString()}
            icon={AcademicCapIcon}
            tone="violet"
          />
          <SoftMetric
            label="Очки опыта"
            value={child.xp.toString()}
            icon={TrophyIcon}
            tone="green"
          />
          <SoftMetric
            label="Серия дней"
            value={child.streakDays.toString()}
            hint="дней подряд"
            icon={FireIcon}
            tone="orange"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SubjectPanel subjects={analytics.subjectScores.slice(0, 6)} />
          <ActivityPanel
            items={analytics.weeklyActivity}
            minutes={analytics.totalStudyTime}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ListCard
            title="Сильные стороны"
            icon={CheckCircleIcon}
            items={analytics.strengths}
            dot="#089567"
          />
          <ListCard
            title="Что подтянуть"
            icon={LightBulbIcon}
            items={analytics.weaknesses}
            dot="#ff5b22"
          />
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

function SoftMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof AcademicCapIcon;
  tone: "violet" | "green" | "orange";
}) {
  const tones = {
    violet: "bg-[#f0e8ff] text-[#7d37ff]",
    green: "bg-[#dff8e8] text-[#079b68]",
    orange: "bg-[#fff0df] text-[#ff5b22]",
  };

  return (
    <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_35px_rgba(37,38,34,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#77786f]">{label}</p>
          <p className="mt-5 text-4xl font-semibold text-[#11120f]">{value}</p>
          {hint && <p className="mt-5 text-sm text-[#77786f]">{hint}</p>}
        </div>
        <span className={`grid size-14 place-items-center rounded-[20px] ${tones[tone]}`}>
          <Icon className="size-6" />
        </span>
      </div>
    </div>
  );
}

function SubjectPanel({ subjects }: { subjects: Array<{ subject: string; score: number }> }) {
  return (
    <div className="rounded-[28px] border border-[#d4d4ca] bg-[#ecece2]/75 p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-[#20211f]">Сен</p>
          <p className="text-xs text-[#77786f]">I неделя</p>
        </div>
        <span className="grid size-10 place-items-center rounded-full bg-[#f2ff19] text-[#2e3129] shadow-[0_0_20px_rgba(242,255,25,0.75)]">
          <CalendarDaysIcon className="size-5" />
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {subjects.map((subject) => (
          <article
            key={subject.subject}
            className="rounded-[24px] bg-white p-5 shadow-[0_18px_35px_rgba(37,38,34,0.05)]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-[#151614]">{subject.subject}</h3>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f2f2ec] text-[#555651]">
                <BeakerIcon className="size-5" />
              </span>
            </div>
            <div className="rounded-[20px] bg-[#ededdf] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#77786f]">Среднее</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#151614]">
                  {Math.round(subject.score)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#d8d8cd]">
                <div
                  className="h-full rounded-full bg-[#eaff00]"
                  style={{ width: `${Math.max(0, Math.min(100, Math.round(subject.score)))}%` }}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ActivityPanel({
  items,
  minutes,
}: {
  items: Array<{ day: string; minutes: number }>;
  minutes: number;
}) {
  const max = Math.max(1, ...items.map((item) => item.minutes));

  return (
    <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_35px_rgba(37,38,34,0.05)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#151614]">Активность</h2>
          <p className="mt-1 text-sm text-[#77786f]">{minutes} минут за период</p>
        </div>
        <ClockIcon className="size-6 text-[#60615b]" />
      </div>
      <div className="flex h-56 items-end gap-4">
        {items.map((item) => (
          <div key={item.day} className="flex flex-1 flex-col items-center gap-3">
            <div
              className="w-full rounded-full bg-[#42433f]"
              style={{ height: `${Math.max(8, (item.minutes / max) * 156)}px` }}
            />
            <span className="text-xs text-[#77786f]">{item.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListCard({
  title,
  icon: Icon,
  items,
  dot,
}: {
  title: string;
  icon: typeof CheckCircleIcon;
  items: string[];
  dot: string;
}) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_35px_rgba(37,38,34,0.05)]">
      <div className="mb-5 flex items-center gap-3">
        <Icon className="size-6" style={{ color: dot }} />
        <h2 className="text-2xl font-semibold text-[#151614]">{title}</h2>
      </div>
      <ul className="space-y-3 text-base text-[#555651]">
        {items.slice(0, 5).map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span
              className="mt-2.5 size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: dot }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
