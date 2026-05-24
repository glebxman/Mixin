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
  Stat,
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
      <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Всего пользователей"
          value={data.totalUsers.toLocaleString("ru")}
          icon={UsersIcon}
          iconAccent="blue"
          hint={data.growth.users !== "—" ? data.growth.users : undefined}
        />
        <Stat
          label="Активных школ"
          value={data.activeSchools.toLocaleString("ru")}
          icon={BuildingLibraryIcon}
          iconAccent="violet"
          hint={data.growth.schools !== "—" ? data.growth.schools : undefined}
        />
        <Stat
          label="AI запросов сегодня"
          value={data.aiRequestsToday.toLocaleString("ru")}
          icon={ChatBubbleLeftRightIcon}
          iconAccent="emerald"
          hint={data.growth.ai !== "—" ? data.growth.ai : undefined}
        />
        <Stat
          label="Доход за месяц"
          value={`$${data.monthlyRevenue.toLocaleString("ru")}`}
          icon={CurrencyDollarIcon}
          iconAccent="orange"
          hint={data.growth.revenue !== "—" ? data.growth.revenue : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ServerStackIcon className="size-5 text-emerald-500" />
            Системный статус
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="stagger-children space-y-2">
            {data.serviceStatus.map((service) => (
              <li
                key={service.name}
                className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3 transition-colors hover:bg-neutral-50/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`size-2 rounded-full ${
                      service.status === "online"
                        ? "animate-pulse-soft bg-emerald-500"
                        : service.status === "degraded"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                  />
                  <span className="text-sm font-medium text-neutral-900">
                    {service.name}
                  </span>
                </div>
                <Badge variant={service.status === "online" ? "success" : "warning"}>
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
