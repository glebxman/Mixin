import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@edtech/api-client";
import { useI18n } from "@edtech/i18n";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@edtech/ui";
import {
  BuildingLibraryIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  ServerStackIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

export function DashboardPage() {
  const { t, lang } = useI18n();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminApi.overview(),
  });

  if (isLoading) return <LoadingState label={t("common.loading")} />;
  if (error || !data) {
    return (
      <ErrorState
        title={t("common.error")}
        message={(error as Error)?.message ?? t("common.loadFailed")}
      />
    );
  }

  const weekDayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

  // Mock fixtures while real time-series data isn't wired through yet.
  // Names go through `t("subjects.*")` so they translate with the language switch.
  const moduleStats = [
    { subjectKey: "subjects.math", percent: 45.2, color: "bg-emerald-400" },
    { subjectKey: "subjects.physics", percent: 28.6, color: "bg-[#00b0ff]" },
    { subjectKey: "subjects.chemistry", percent: 15.3, color: "bg-amber-400" },
    { subjectKey: "subjects.history", percent: 10.9, color: "bg-rose-400" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t("admin.dashboardPage.eyebrow")}
        title={t("admin.dashboardPage.title")}
        description={t("admin.dashboardPage.description")}
      />

      {/* 4 Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("admin.dashboardPage.statTotalUsers")}
          value={data.totalUsers.toLocaleString(lang)}
          delta="+14.8%"
          deltaSuffix={t("admin.dashboardPage.thisMonth")}
          deltaTone="up"
          icon={<UsersIcon className="size-5" />}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          label={t("admin.dashboardPage.statActiveSchools")}
          value={data.activeSchools.toLocaleString(lang)}
          delta="+5.2%"
          deltaSuffix={t("admin.dashboardPage.thisMonth")}
          deltaTone="up"
          icon={<BuildingLibraryIcon className="size-5" />}
          iconBg="bg-violet-50 text-violet-600"
        />
        <StatCard
          label={t("admin.dashboardPage.statAiToday")}
          value={data.aiRequestsToday.toLocaleString(lang)}
          delta="+24.1%"
          deltaSuffix={t("admin.dashboardPage.vsYesterday")}
          deltaTone="up"
          icon={<ChatBubbleLeftRightIcon className="size-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label={t("admin.dashboardPage.statRevenue")}
          value={`$${data.monthlyRevenue.toLocaleString(lang)}`}
          delta="-2.1%"
          deltaSuffix={t("admin.dashboardPage.thisMonth")}
          deltaTone="down"
          icon={<CurrencyDollarIcon className="size-5" />}
          iconBg="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-[32px] border border-neutral-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-base font-bold text-neutral-900">
                {t("admin.dashboardPage.activityTitle")}
              </h4>
              <p className="text-xs text-neutral-400 font-medium">
                {t("admin.dashboardPage.activityDesc")}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-800">
                {t("admin.dashboardPage.filterDaily")}
              </button>
              <button className="px-3 py-1 text-xs font-semibold rounded-full text-neutral-400 hover:bg-neutral-50">
                {t("admin.dashboardPage.filterWeekly")}
              </button>
            </div>
          </div>

          <div className="h-64 relative w-full">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e676" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00e676" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f2f4" strokeWidth="1" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f2f4" strokeWidth="1" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f2f4" strokeWidth="1" />
              <line x1="0" y1="160" x2="500" y2="160" stroke="#f1f2f4" strokeWidth="1" />
              <path
                d="M 0 160 Q 100 130 200 145 T 400 80 Q 450 60 500 40 L 500 200 L 0 200 Z"
                fill="url(#chartGrad)"
              />
              <path
                d="M 0 160 Q 100 130 200 145 T 400 80 Q 450 60 500 40"
                fill="none"
                stroke="#00e676"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="200" cy="145" r="5" fill="#00e676" stroke="#fff" strokeWidth="2" />
              <circle cx="400" cy="80" r="5" fill="#00e676" stroke="#fff" strokeWidth="2" />
              <circle cx="500" cy="40" r="5" fill="#00e676" stroke="#fff" strokeWidth="2" />
            </svg>
            <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-4">
              {weekDayKeys.map((d) => (
                <span key={d}>{t(`weekdays.${d}`)}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-neutral-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-base font-bold text-neutral-900">
                {t("admin.dashboardPage.moduleTitle")}
              </h4>
              <p className="text-xs text-neutral-400 font-medium">
                {t("admin.dashboardPage.moduleDesc")}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {moduleStats.map((m) => (
              <div key={m.subjectKey} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-neutral-600">
                  <span>{t(m.subjectKey)}</span>
                  <span>{m.percent}%</span>
                </div>
                <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                  <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card className="border border-neutral-200/60 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.02)] bg-white overflow-hidden p-6">
        <CardHeader className="p-0 pb-4 border-b border-neutral-100">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-neutral-900">
            <ServerStackIcon className="size-5 text-emerald-500" />
            {t("admin.dashboardPage.systemStatus")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.serviceStatus.map((service) => (
              <li
                key={service.name}
                className="flex items-center justify-between rounded-2xl border border-neutral-100 px-4 py-3.5 bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`size-2 rounded-full ${
                      service.status === "online"
                        ? "animate-pulse bg-emerald-500"
                        : service.status === "degraded"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                  />
                  <span className="text-xs font-bold text-neutral-700">{service.name}</span>
                </div>
                <Badge
                  variant={service.status === "online" ? "success" : "warning"}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                >
                  {t("admin.dashboardPage.uptime")}: {service.uptime}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function StatCard({
  label,
  value,
  delta,
  deltaSuffix,
  deltaTone,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  delta: string;
  deltaSuffix: string;
  deltaTone: "up" | "down";
  icon: React.ReactNode;
  iconBg: string;
}) {
  const toneClass =
    deltaTone === "up" ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50";
  return (
    <div className="rounded-[28px] border border-neutral-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
          {label}
        </span>
        <span className={`p-2 rounded-xl ${iconBg}`}>{icon}</span>
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-extrabold tracking-tight text-neutral-900">{value}</h3>
        <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
          deltaTone === "up" ? "text-emerald-600" : "text-rose-600"
        }`}>
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ${toneClass}`}>
            {delta}
          </span>
          {deltaSuffix}
        </p>
      </div>
    </div>
  );
}
