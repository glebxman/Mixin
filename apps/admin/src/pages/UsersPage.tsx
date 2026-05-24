import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminUser } from "@edtech/api-client";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Spinner,
} from "@edtech/ui";
import { UsersIcon } from "@heroicons/react/24/outline";

const roleVariant: Record<string, "success" | "warning" | "info" | "default"> = {
  STUDENT: "info",
  PARENT: "success",
  SCHOOL_ADMIN: "warning",
  SUPER_ADMIN: "default",
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.users(),
  });

  const setActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.setUserActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const [pendingId, setPendingId] = useState<string | null>(null);

  function handleToggle(user: AdminUser) {
    setPendingId(user.id);
    setActiveMutation.mutate(
      { id: user.id, isActive: !user.isActive },
      { onSettled: () => setPendingId(null) },
    );
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <>
      <PageHeader
        eyebrow="Управление"
        title="Пользователи"
        description="Просмотр пользователей и блокировка аккаунтов"
      />
      {!data || data.length === 0 ? (
        <EmptyState
          title="Пользователи не найдены"
          description="Они появятся здесь после регистрации."
          icon={UsersIcon}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-6 py-3">Имя</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Роль</th>
                <th className="px-6 py-3">Статус</th>
                <th className="px-6 py-3">Создан</th>
                <th className="px-6 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm text-neutral-700">
              {data.map((u) => {
                const fullName = u.profile
                  ? `${u.profile.firstName} ${u.profile.lastName}`.trim()
                  : "—";
                const isPending = pendingId === u.id && setActiveMutation.isPending;
                return (
                  <tr key={u.id} className="transition hover:bg-neutral-50/60">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={fullName === "—" ? u.email : fullName}
                          size="sm"
                        />
                        <span className="font-medium text-neutral-900">
                          {fullName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-neutral-500">{u.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant={roleVariant[u.role] ?? "default"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={u.isActive ? "success" : "danger"}>
                        {u.isActive ? "active" : "blocked"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-neutral-500">
                      {new Date(u.createdAt).toLocaleDateString("ru")}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        size="sm"
                        variant={u.isActive ? "outline" : "default"}
                        disabled={isPending || u.role === "SUPER_ADMIN"}
                        onClick={() => handleToggle(u)}
                      >
                        {isPending && <Spinner size="sm" className="text-current" />}
                        {u.isActive ? "Заблокировать" : "Разблокировать"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
