import { useQuery } from "@tanstack/react-query";
import { studentApi, type StudentAnalytics } from "@edtech/api-client";
import { useI18n } from "@edtech/i18n";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  ProgressBar,
  Stat,
  cn,
} from "@edtech/ui";
import {
  AcademicCapIcon,
  BeakerIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  LinkIcon,
  MapIcon,
  PuzzlePieceIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { LevelCard } from "@/components/analytics/LevelCard";
import { SubjectScores } from "@/components/analytics/SubjectScores";
import { WeeklyActivityChart } from "@/components/analytics/WeeklyActivityChart";
import { StrengthsCard } from "@/components/analytics/StrengthsCard";
import { WeaknessesCard } from "@/components/analytics/WeaknessesCard";
import { RecommendationsCard } from "@/components/analytics/RecommendationsCard";
import { UniversityChancesCard } from "@/components/analytics/UniversityChancesCard";

export function AnalyticsPage() {
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ["student", "analytics"],
    queryFn: () => studentApi.analytics(),
  });

  if (query.isLoading) return <LoadingState label={t("analytics.loading")} />;
  if (query.error) return <ErrorState message={(query.error as Error).message} />;
  if (!query.data) {
    return <EmptyState title={t("common.noData")} icon={ChartBarIcon} />;
  }

  const analytics = query.data;
  const totalHours = Math.floor(analytics.totalStudyTime / 60);
  const totalMinutes = analytics.totalStudyTime % 60;
  const maxActivity = Math.max(1, ...analytics.weeklyActivity.map((d) => d.minutes));
  const questPercent =
    analytics.totalQuests > 0
      ? Math.round((analytics.completedQuests / analytics.totalQuests) * 100)
      : 0;

  return (
    <>
      <PageHeader
        eyebrow={t("analytics.eyebrow")}
        title={t("analytics.title")}
        description={t("analytics.description")}
        className="items-end"
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ProfileCard analytics={analytics} />
        <CareerCard analytics={analytics} />
      </div>

      <div className="stagger-children grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LevelCard analytics={analytics} />
        <Stat
          label={t("analytics.overallProgress")}
          value={`${analytics.overallProgress}%`}
          icon={ChartBarIcon}
          iconAccent="emerald"
        />
        <Stat
          label={t("analytics.studyTime")}
          value={t("common.hours", { hours: totalHours })}
          hint={t("common.minutes", { minutes: totalMinutes })}
          icon={ClockIcon}
          iconAccent="blue"
        />
        <Stat
          label={t("analytics.quests")}
          value={`${analytics.completedQuests}/${analytics.totalQuests}`}
          hint={t("analytics.completedPercent", { percent: questPercent })}
          icon={PuzzlePieceIcon}
          iconAccent="violet"
        />
      </div>

      {analytics.aiAnalysisStudent && (
        <div className="my-4">
          <AiAnalysisCard feedback={analytics.aiAnalysisStudent} />
        </div>
      )}

      {analytics.universityChances && analytics.universityChances.length > 0 && (
        <div className="my-4">
          <UniversityChancesCard items={analytics.universityChances} />
        </div>
      )}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)]">
        <div className="min-w-0 space-y-4">
          <SubjectScores items={analytics.subjectScores} />
          <WeeklyActivityChart items={analytics.weeklyActivity} max={maxActivity} />
          <LearningPlanCard analytics={analytics} />
        </div>
        <div className="min-w-0 space-y-4">
          <QuestStrategyCard analytics={analytics} />
          <RecommendationsCard items={analytics.recommendations} />
          <StrengthsCard items={analytics.strengths} />
          <WeaknessesCard items={analytics.weaknesses} />
          <SystemReadinessCard analytics={analytics} />
        </div>
      </div>
    </>
  );
}

function ProfileCard({ analytics }: { analytics: StudentAnalytics }) {
  const { t } = useI18n();
  const profile = analytics.profileSummary;
  const chips = [
    profile.grade,
    profile.age ? t("common.yearsOld", { age: profile.age }) : null,
    profile.schoolName,
    profile.careerDirection,
    profile.targetProfession,
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-5 text-[#6084ff]" />
          {t("analytics.profileTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {chips.map((item) => (
            <Badge key={item} variant="outline">{item}</Badge>
          ))}
        </div>
        <InfoList
          items={[
            {
              label: t("profile.interestsTitle"),
              value: profile.interests.length ? profile.interests.join(", ") : t("analytics.fillInProfile"),
            },
            {
              label: t("profile.subjectsTitle"),
              value: profile.favoriteSubjects.length
                ? profile.favoriteSubjects.join(", ")
                : t("analytics.notSpecified"),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

function CareerCard({ analytics }: { analytics: StudentAnalytics }) {
  const { t } = useI18n();
  const career = analytics.careerInsight;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AcademicCapIcon className="size-5 text-emerald-600" />
          {t("analytics.careerVector")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-lg font-semibold text-neutral-950">
              {career.title}
            </p>
            <Badge variant="info">{career.matchScore}% match</Badge>
          </div>
          <ProgressBar value={career.matchScore} />
          <p className="mt-3 text-sm leading-6 text-neutral-600">{career.description}</p>
        </div>
        <TagBlock title={t("analytics.requiredSubjects")} items={career.requiredSubjects} />
        {career.universities.length > 0 && (
          <TagBlock title={t("analytics.targetUniversities")} items={career.universities} />
        )}
      </CardContent>
    </Card>
  );
}

function LearningPlanCard({ analytics }: { analytics: StudentAnalytics }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="size-5 text-[#6084ff]" />
          {t("analytics.learningPlan")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {analytics.learningPlan.map((item) => (
            <li key={item.title} className="rounded-2xl border border-neutral-100 bg-neutral-50/70 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="min-w-0 text-sm font-semibold text-neutral-950">{item.title}</p>
                <Badge variant={priorityVariant(item.priority)}>{t("analytics.minutesPerDay", { minutes: item.minutesPerDay })}</Badge>
              </div>
              <p className="text-sm leading-6 text-neutral-600">{item.description}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function QuestStrategyCard({ analytics }: { analytics: StudentAnalytics }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PuzzlePieceIcon className="size-5 text-violet-600" />
          {t("analytics.educationalQuests")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoList
          items={[
            { label: t("analytics.format"), value: analytics.questStrategy.format },
            { label: t("analytics.focus"), value: analytics.questStrategy.focus },
          ]}
        />
        <ul className="space-y-3">
          {analytics.questStrategy.recommended.map((quest) => (
            <li key={quest.title} className="rounded-2xl bg-violet-50/70 p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-950">{quest.title}</p>
                <Badge variant="outline">{t(`quests.difficulty.${quest.difficulty}`)}</Badge>
              </div>
              <p className="text-xs leading-5 text-neutral-600">{quest.description}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SystemReadinessCard({ analytics }: { analytics: StudentAnalytics }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CpuChipIcon className="size-5 text-neutral-700" />
          {t("analytics.modulesAndIntegrations")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatusGroup
          icon={LinkIcon}
          title={t("analytics.integrations")}
          items={analytics.integrations.map((item) => ({
            name: item.name,
            status: statusLabel(item.status, t),
            description: item.description,
            active: item.status === "connected",
          }))}
        />
        <StatusGroup
          icon={BeakerIcon}
          title={t("analytics.aiModules")}
          items={analytics.aiModules.map((item) => ({
            name: item.name,
            status: item.status === "active" ? t("analytics.statusActive") : t("analytics.statusPlanned"),
            description: item.description,
            active: item.status === "active",
          }))}
        />
      </CardContent>
    </Card>
  );
}

function InfoList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm leading-6 text-neutral-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TagBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="default">{item}</Badge>
        ))}
      </div>
    </div>
  );
}

function StatusGroup({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof BoltIcon;
  title: string;
  items: Array<{ name: string; status: string; description: string; active: boolean }>;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-950">
        <Icon className="size-4" />
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.name} className="rounded-2xl border border-neutral-100 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-neutral-950">{item.name}</p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                  item.active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                )}
              >
                {item.active && <CheckCircleIcon className="size-3.5" />}
                {item.status}
              </span>
            </div>
            <p className="text-xs leading-5 text-neutral-600">{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function priorityVariant(priority: "high" | "medium" | "low") {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "success";
}

function statusLabel(status: "connected" | "planned" | "needs_setup", t: any) {
  if (status === "connected") return t("analytics.statusConnected");
  if (status === "needs_setup") return t("analytics.statusNeedsSetup");
  return t("analytics.statusPlanned");
}

function AiAnalysisCard({ feedback }: { feedback: string }) {
  const { t } = useI18n();
  const paragraphs = feedback.split("\n").filter((p) => p.trim().length > 0);

  return (
    <Card className="relative overflow-hidden border-violet-150 dark:border-violet-900/40 bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/30 dark:from-violet-950/30 dark:via-neutral-900 dark:to-indigo-950/20 bg-transparent dark:bg-transparent shadow-sm">
      <div className="absolute right-0 top-0 -mr-6 -mt-6 size-24 rounded-full bg-violet-200/20 dark:bg-violet-800/10 blur-2xl" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-neutral-950 dark:text-neutral-50">
          <SparklesIcon className="size-6 text-violet-600 dark:text-violet-400 animate-pulse" />
          {t("analytics.aiAnalysisTitle")}
        </CardTitle>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
          {t("analytics.aiAnalysisDescription")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {paragraphs.map((para, index) => (
          <p
            key={index}
            className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 font-normal"
          >
            {para}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
