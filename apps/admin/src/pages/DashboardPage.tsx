import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@edtech/api-client";
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminApi.overview(),
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) {
    return (
      <ErrorState message={(error as Error)?.message ?? "Не удалось загрузить"} />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Платформа"
        title="Админ-панель"
        description="Состояние Mixin EdTech UZ"
      />

      {/* 4 Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Stat 1 */}
        <div className="rounded-[28px] border border-neutral-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Всего пользователей</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <UsersIcon className="size-5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              {data.totalUsers.toLocaleString("ru")}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px]">
                +14.8%
              </span>
              за этот месяц
            </p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="rounded-[28px] border border-neutral-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Активных школ</span>
            <span className="p-2 rounded-xl bg-violet-50 text-violet-600">
              <BuildingLibraryIcon className="size-5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              {data.activeSchools.toLocaleString("ru")}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px]">
                +5.2%
              </span>
              за этот месяц
            </p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="rounded-[28px] border border-neutral-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">AI запросов сегодня</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ChatBubbleLeftRightIcon className="size-5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              {data.aiRequestsToday.toLocaleString("ru")}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px]">
                +24.1%
              </span>
              по сравнению со вчера
            </p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="rounded-[28px] border border-neutral-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Доход за месяц</span>
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <CurrencyDollarIcon className="size-5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              ${data.monthlyRevenue.toLocaleString("ru")}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600">
              <span className="inline-flex items-center rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px]">
                -2.1%
              </span>
              за этот месяц
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section: Elegant Mock Charts mimicking the screenshot */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Chart 1: Activity Analytics (Left 2 columns) */}
        <div className="md:col-span-2 rounded-[32px] border border-neutral-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-base font-bold text-neutral-900">Аналитика активности</h4>
              <p className="text-xs text-neutral-400 font-medium">Динамика взаимодействия с ИИ-тьютором</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-800">Дневная</button>
              <button className="px-3 py-1 text-xs font-semibold rounded-full text-neutral-400 hover:bg-neutral-50">Недельная</button>
            </div>
          </div>

          {/* Pure HTML Line Chart using SVG */}
          <div className="h-64 relative w-full">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e676" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00e676" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f2f4" strokeWidth="1" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f2f4" strokeWidth="1" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f2f4" strokeWidth="1" />
              <line x1="0" y1="160" x2="500" y2="160" stroke="#f1f2f4" strokeWidth="1" />
              
              {/* Area */}
              <path
                d="M 0 160 Q 100 130 200 145 T 400 80 Q 450 60 500 40 L 500 200 L 0 200 Z"
                fill="url(#chartGrad)"
              />
              {/* Line */}
              <path
                d="M 0 160 Q 100 130 200 145 T 400 80 Q 450 60 500 40"
                fill="none"
                stroke="#00e676"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Data points */}
              <circle cx="200" cy="145" r="5" fill="#00e676" stroke="#fff" strokeWidth="2" className="shadow" />
              <circle cx="400" cy="80" r="5" fill="#00e676" stroke="#fff" strokeWidth="2" className="shadow" />
              <circle cx="500" cy="40" r="5" fill="#00e676" stroke="#fff" strokeWidth="2" className="shadow" />
            </svg>
            <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-4">
              <span>Пн</span>
              <span>Вт</span>
              <span>Ср</span>
              <span>Чт</span>
              <span>Пт</span>
              <span>Сб</span>
              <span>Вс</span>
            </div>
          </div>
        </div>

        {/* Chart 2: AI requests by Module (Right 1 column) */}
        <div className="rounded-[32px] border border-neutral-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-base font-bold text-neutral-900">ИИ по модулям</h4>
              <p className="text-xs text-neutral-400 font-medium">Распределение запросов</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-neutral-600">
                <span>Математика</span>
                <span>45.2%</span>
              </div>
              <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: "45.2%" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-neutral-600">
                <span>Физика</span>
                <span>28.6%</span>
              </div>
              <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#00b0ff] rounded-full" style={{ width: "28.6%" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-neutral-600">
                <span>Химия</span>
                <span>15.3%</span>
              </div>
              <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: "15.3%" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-neutral-600">
                <span>История</span>
                <span>10.9%</span>
              </div>
              <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-400 rounded-full" style={{ width: "10.9%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Card */}
      <Card className="border border-neutral-200/60 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.02)] bg-white overflow-hidden p-6">
        <CardHeader className="p-0 pb-4 border-b border-neutral-100">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-neutral-900">
            <ServerStackIcon className="size-5 text-emerald-500" />
            Системный статус
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
                  <span className="text-xs font-bold text-neutral-700">
                    {service.name}
                  </span>
                </div>
                <Badge variant={service.status === "online" ? "success" : "warning"} className="rounded-full px-2 py-0.5 text-[10px] font-bold">
                  Uptime: {service.uptime}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
