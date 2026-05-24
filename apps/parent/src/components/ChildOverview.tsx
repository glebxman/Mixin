import { Link } from "react-router-dom";
import type { ParentChildOverview, Recommendation, SubjectScore } from "@edtech/api-client";
import {
  AcademicCapIcon,
  BeakerIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  LightBulbIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useI18n } from "@edtech/i18n";

const chromePills = [
  { labelKey: "parent.overview.pillProgress", icon: ChartBarIcon },
  { labelKey: "parent.overview.pillSubjects", icon: BookOpenIcon },
  { labelKey: "parent.overview.pillQuests", icon: AcademicCapIcon },
  { labelKey: "parent.overview.pillAdvice", icon: LightBulbIcon },
  { labelKey: "parent.overview.pillRhythm", icon: CalendarDaysIcon },
];

const filterPills = [
  "parent.overview.filterAll",
  "parent.overview.filterSubjects",
  "parent.overview.filterQuests",
  "parent.overview.filterRecommendations",
  "parent.overview.filterActivity",
] as const;

export function ChildOverview({ overview }: { overview: ParentChildOverview }) {
  const { t } = useI18n();
  const { child, analytics } = overview;
  const fullName = `${child.firstName} ${child.lastName}`.trim();
  const studyHours = Math.floor(analytics.totalStudyTime / 60);
  const studyMinutes = analytics.totalStudyTime % 60;
  const subjects = analytics.subjectScores.slice(0, 4);
  const recs = analytics.recommendations.slice(0, 3);

  return (
    <section className="overflow-hidden rounded-[34px] border border-[#d8d8d2] bg-[#d8d8d0] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
      <div className="rounded-t-[34px] bg-[#3f403d] px-4 pb-0 pt-4">
        <div className="flex items-center gap-2">
          <div className="rounded-t-[28px] bg-[#eeeee5] px-8 py-4 text-2xl font-semibold text-[#1e1f1d]">
            {t("parent.overview.title")}
          </div>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            {chromePills.map((item, index) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.labelKey}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-medium ${index === 0
                      ? "bg-white text-[#1f201d]"
                      : "bg-[#f2f2ec] text-[#555651]"
                    }`}
                >
                  <Icon className="size-3.5" />
                  {t(item.labelKey)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-b-[34px] bg-[#eeeee5] px-6 pb-6 pt-5 lg:px-8">
        <div className="absolute inset-x-0 top-[220px] h-px bg-[#cfcfc5]" />
        <div className="absolute bottom-0 left-[24%] top-[220px] hidden w-px bg-[#c9c9bf] md:block" />
        <div className="absolute bottom-0 left-[50%] top-[220px] hidden w-px bg-[#c9c9bf] md:block" />
        <div className="absolute bottom-0 left-[76%] top-[220px] hidden w-px bg-[#c9c9bf] md:block" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[170px_1fr]">
          <ProfileCard name={fullName} child={child} />

          <div className="min-w-0">
            <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-medium uppercase text-[#77786f]">
                  {t("parent.overview.diagnostics")}
                </p>
                <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#151614]">
                  {fullName}
                </h1>
                <p className="mt-2 text-sm text-[#686963]">
                  {child.grade} • {child.schoolName ?? t("parent.schoolNotSet")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 lg:min-w-[520px]">
                <Metric
                  label={t("parent.metricProgress")}
                  value={`${analytics.overallProgress}%`}
                />
                <Metric
                  label={t("parent.overview.metricTime")}
                  value={t("parent.overview.studyTimeFormat", {
                    hours: studyHours,
                    minutes: studyMinutes,
                  })}
                />
                <Metric label={t("parent.metricXp")} value={child.xp.toString()} />
                <Metric
                  label={t("parent.metricStreak")}
                  value={child.streakDays.toString()}
                />
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-2">
              {filterPills.map((key, index) => (
                <span
                  key={key}
                  className={`rounded-full px-4 py-2 text-xs font-medium ${index === 0
                      ? "bg-white text-[#20211f]"
                      : "bg-[#f7f7f1] text-[#686963]"
                    }`}
                >
                  {t(key)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid gap-5 lg:grid-cols-2">
          {[0, 1].map((index) => (
            <TimelineColumn
              key={index}
              week={
                index === 0
                  ? t("parent.overview.weekFirst")
                  : t("parent.overview.weekSecond")
              }
              subjects={subjects.slice(index * 2, index * 2 + 2)}
              recommendations={recs.slice(index, index + 2)}
              accent={index === 0 ? "#f2ff19" : "#efff24"}
            />
          ))}
        </div>

        <div className="relative z-10 mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <ActivityStrip items={analytics.weeklyActivity} />
          <Strengths items={analytics.strengths} />
        </div>

        <Link
          to={`/child/${child.id}`}
          className="absolute right-8 top-[205px] z-20 grid size-10 place-items-center rounded-full bg-[#20211f] text-white transition hover:bg-black"
          aria-label={t("parent.overview.detailsAria")}
        >
          <PlusIcon className="size-5" />
        </Link>
      </div>
    </section>
  );
}

function ProfileCard({
  name,
  child,
}: {
  name: string;
  child: ParentChildOverview["child"];
}) {
  const { t } = useI18n();
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-[26px] bg-white px-4 py-4 shadow-[0_14px_30px_rgba(35,36,32,0.05)]">
      <div className="grid size-20 place-items-center rounded-[22px] bg-[#f0e2d8] text-2xl font-semibold text-[#343431]">
        {initials}
      </div>
      <p className="mt-3 text-[11px] font-medium text-[#77786f]">
        {t("parent.overview.studentLabel")}
      </p>
      <p className="text-sm font-semibold text-[#1f201d]">{name}</p>
      <p className="mt-1 text-xs text-[#77786f]">{child.grade}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[#77786f]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#161714]">{value}</p>
    </div>
  );
}

function TimelineColumn({
  week,
  subjects,
  recommendations,
  accent,
}: {
  week: string;
  subjects: SubjectScore[];
  recommendations: Recommendation[];
  accent: string;
}) {
  return (
    <div className="relative min-h-[360px] rounded-[28px] border border-[#d4d4ca] bg-[#ecece2]/75 p-5">
      <div
        className="absolute -top-4 left-10 grid size-8 place-items-center rounded-full text-[#2e3129] shadow-[0_0_20px_rgba(242,255,25,0.75)]"
        style={{ backgroundColor: accent }}
      >
        <CalendarDaysIcon className="size-4" />
      </div>
      <div className="mb-6 pl-8">
        <p className="text-[11px] text-[#77786f]">{week}</p>
      </div>

      <div className="space-y-4">
        {subjects.map((subject) => (
          <SubjectPanel key={subject.subject} item={subject} />
        ))}
        {recommendations.map((item, index) => (
          <RecommendationPill key={`${item.title}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function SubjectPanel({ item }: { item: SubjectScore }) {
  const { t } = useI18n();
  const score = Math.round(item.score);
  return (
    <article className="rounded-[22px] bg-white p-4 shadow-[0_18px_35px_rgba(37,38,34,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1c1d1a]">{item.subject}</h3>
        <span className="grid size-8 place-items-center rounded-full bg-[#f3f3ed] text-[#555651]">
          <BeakerIcon className="size-4" />
        </span>
      </div>
      <div className="relative h-14 overflow-hidden rounded-2xl bg-[#ededdf]">
        <div className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#f2ff19]" />
        <div className="absolute bottom-3 left-3 text-[11px] text-[#77786f]">
          {t("parent.child.average")}
        </div>
        <div className="absolute bottom-3 right-3 text-sm font-semibold text-[#1c1d1a]">
          {score}%
        </div>
      </div>
    </article>
  );
}

function RecommendationPill({ item }: { item: Recommendation }) {
  const tone =
    item.priority === "high"
      ? "bg-[#ffe9e1] text-[#f15d2a]"
      : item.priority === "medium"
        ? "bg-[#fff5d8] text-[#8a6b00]"
        : "bg-[#e8f8ef] text-[#089567]";

  return (
    <div className="flex items-start gap-3 rounded-[22px] bg-white p-4 shadow-[0_18px_35px_rgba(37,38,34,0.05)]">
      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${tone}`}>
        <LightBulbIcon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-[#1c1d1a]">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6e6f68]">
          {item.description}
        </p>
      </div>
    </div>
  );
}

function ActivityStrip({ items }: { items: ParentChildOverview["analytics"]["weeklyActivity"] }) {
  const { t } = useI18n();
  const max = Math.max(1, ...items.map((item) => item.minutes));

  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_18px_35px_rgba(37,38,34,0.05)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1c1d1a]">
          {t("parent.overview.activityTitle")}
        </h2>
        <ClockIcon className="size-5 text-[#60615b]" />
      </div>
      <div className="flex h-32 items-end gap-3">
        {items.map((item) => (
          <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-full bg-[#42433f]"
              style={{ height: `${Math.max(8, (item.minutes / max) * 96)}px` }}
            />
            <span className="text-[11px] text-[#77786f]">{item.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Strengths({ items }: { items: string[] }) {
  const { t } = useI18n();
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_18px_35px_rgba(37,38,34,0.05)]">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircleIcon className="size-5 text-[#089567]" />
        <h2 className="text-lg font-semibold text-[#1c1d1a]">
          {t("parent.overview.strengthsTitle")}
        </h2>
      </div>
      <ul className="space-y-2 text-sm text-[#555651]">
        {items.slice(0, 5).map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#089567]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
