import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, getPlanLabelKey, type AdminUser } from "@edtech/api-client";
import type { Role, SubscriptionPlan } from "@edtech/types";
import { useI18n } from "@edtech/i18n";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  Spinner,
  cn,
} from "@edtech/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const ROLE_VARIANT: Record<string, "success" | "warning" | "info" | "default"> = {
  STUDENT: "info",
  PARENT: "success",
  SCHOOL_ADMIN: "warning",
  SUPER_ADMIN: "default",
};

const PLAN_VARIANT: Record<SubscriptionPlan, "default" | "info" | "success"> = {
  FREE: "default",
  BASIC: "info",
  PREMIUM: "success",
};

const PAGE_SIZES = [10, 20, 50] as const;
const ROLES: Role[] = ["STUDENT", "PARENT", "SUPER_ADMIN"];
const PLANS: SubscriptionPlan[] = ["FREE", "BASIC", "PREMIUM"];

function planLabel(plan: SubscriptionPlan, t: (key: string) => string) {
  return t(getPlanLabelKey(plan));
}

export function UsersPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();

  // Filters & paging
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [plan, setPlan] = useState<SubscriptionPlan | "">("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "blocked">("");

  // Stats dialog state
  const [statsUserId, setStatsUserId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  const queryKey = useMemo(
    () => [
      "admin",
      "users",
      { page, pageSize, search, role, plan, statusFilter },
    ],
    [page, pageSize, search, role, plan, statusFilter],
  );

  const usersQuery = useQuery({
    queryKey,
    queryFn: () =>
      adminApi.users({
        page,
        pageSize,
        q: search || undefined,
        role: (role || undefined) as Role | undefined,
        plan: (plan || undefined) as SubscriptionPlan | undefined,
        isActive:
          statusFilter === "active"
            ? true
            : statusFilter === "blocked"
              ? false
              : undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const setActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.setUserActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [planDialog, setPlanDialog] = useState<AdminUser | null>(null);

  function handleToggleBlock(user: AdminUser) {
    setPendingId(user.id);
    setActiveMutation.mutate(
      { id: user.id, isActive: !user.isActive },
      { onSettled: () => setPendingId(null) },
    );
  }

  if (usersQuery.isLoading && !usersQuery.data) return <LoadingState label={t("common.loading")} />;
  if (usersQuery.error)
    return <ErrorState title={t("common.error")} message={(usersQuery.error as Error).message} />;

  const data = usersQuery.data;
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = Math.min(total, page * pageSize);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          eyebrow={t("admin.usersPage.eyebrow")}
          title={t("admin.usersPage.title")}
          description={t("admin.usersPage.description")}
        />
      </div>

      <Card className="overflow-hidden border border-neutral-200/60 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] bg-white p-0">
        {/* ─── Toolbar: search + filters styled in exact screenshot style ─── */}
        <div className="flex flex-col gap-4 border-b border-neutral-100 px-6 py-5 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-neutral-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t("admin.usersPage.searchPlaceholder")}
              className="pl-10 h-11 rounded-full bg-neutral-50/50 border-neutral-200 hover:bg-neutral-50 focus:bg-white text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <SelectFilter
              value={role}
              onChange={(value) => {
                setRole(value as Role | "");
                setPage(1);
              }}
              placeholder={t("admin.usersPage.filterAllRoles")}
              options={ROLES.map((r) => ({ value: r, label: r }))}
            />
            <SelectFilter
              value={plan}
              onChange={(value) => {
                setPlan(value as SubscriptionPlan | "");
                setPage(1);
              }}
              placeholder={t("admin.usersPage.filterAllPlans")}
              options={PLANS.map((p) => ({ value: p, label: planLabel(p, t) }))}
            />
            <SelectFilter
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as "" | "active" | "blocked");
                setPage(1);
              }}
              placeholder={t("admin.usersPage.filterAllStatus")}
              options={[
                { value: "active", label: t("admin.usersPage.statusActive") },
                { value: "blocked", label: t("admin.usersPage.statusBlocked") },
              ]}
            />
          </div>
        </div>

        {/* ─── Table ─── */}
        {items.length === 0 ? (
          <div className="px-6 py-12">
            <EmptyState
              title={t("admin.usersPage.noResults")}
              description={t("admin.usersPage.noResultsDesc")}
              icon={UsersIcon}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="bg-neutral-50/75 border-b border-neutral-100 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-6 py-4">{t("admin.usersPage.thName")}</th>
                  <th className="px-6 py-4">{t("admin.usersPage.thEmail")}</th>
                  <th className="px-6 py-4">{t("admin.usersPage.thRole")}</th>
                  <th className="px-6 py-4">{t("admin.usersPage.thPlan")}</th>
                  <th className="px-6 py-4">{t("admin.usersPage.thStatus")}</th>
                  <th className="px-6 py-4">{t("admin.usersPage.thCreated")}</th>
                  <th className="px-6 py-4 text-right">
                    {t("admin.usersPage.thActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm text-neutral-700">
                {items.map((u) => {
                  const fullName = u.profile
                    ? `${u.profile.firstName} ${u.profile.lastName}`.trim()
                    : "—";
                  const isPendingBlock =
                    pendingId === u.id && setActiveMutation.isPending;
                  return (
                    <tr key={u.id} className="transition hover:bg-neutral-50/50">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={fullName === "—" ? u.email : fullName}
                            className="size-9 text-xs font-semibold bg-neutral-100 text-neutral-800"
                          />
                          <span className="font-semibold text-neutral-900">
                            {fullName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-neutral-500 font-medium">{u.email}</td>
                      <td className="px-6 py-3.5">
                        <Badge variant={ROLE_VARIANT[u.role] ?? "default"} className="rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant={PLAN_VARIANT[u.subscriptionPlan]} className="rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                          {planLabel(u.subscriptionPlan, t)}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant={u.isActive ? "success" : "danger"} className="rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                          {u.isActive
                            ? t("admin.usersPage.statusActive")
                            : t("admin.usersPage.statusBlocked")}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-neutral-500 font-medium">
                        {new Date(u.createdAt).toLocaleDateString(lang)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {u.role === "STUDENT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setStatsUserId(u.id)}
                              className="rounded-full text-emerald-600 border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-200 text-xs font-semibold px-3 py-1"
                            >
                              {t("admin.usersPage.analyticsModal.openButton")}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPlanDialog(u)}
                            className="rounded-full text-xs font-semibold px-3 py-1"
                          >
                            {t("admin.usersPage.changePlan")}
                          </Button>
                          <Button
                            size="sm"
                            variant={u.isActive ? "outline" : "default"}
                            disabled={isPendingBlock || u.role === "SUPER_ADMIN"}
                            onClick={() => handleToggleBlock(u)}
                            className={cn(
                              "rounded-full text-xs font-semibold px-3 py-1",
                              u.isActive ? "text-neutral-600" : "bg-neutral-900 text-white hover:bg-neutral-800"
                            )}
                          >
                            {isPendingBlock && (
                              <Spinner size="sm" className="text-current mr-1" />
                            )}
                            {u.isActive
                              ? t("admin.usersPage.block")
                              : t("admin.usersPage.unblock")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Pagination footer ─── */}
        <div className="flex flex-col gap-3 border-t border-neutral-100 px-6 py-4 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span>{t("admin.usersPage.rowsPerPage")}</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-9 rounded-full border border-neutral-200 bg-white px-3 text-xs font-semibold focus:border-neutral-400 focus:outline-none"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="font-medium">
              {t("admin.usersPage.showingOf", {
                from: fromRow,
                to: toRow,
                total,
              })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium mr-2">
              {t("admin.usersPage.page", { page, totalPages })}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || usersQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full px-3"
            >
              <ChevronLeftIcon className="size-4 mr-0.5" />
              {t("admin.usersPage.prev")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || usersQuery.isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-full px-3"
            >
              {t("admin.usersPage.next")}
              <ChevronRightIcon className="size-4 ml-0.5" />
            </Button>
          </div>
        </div>
      </Card>

      {planDialog && (
        <PlanDialog user={planDialog} onClose={() => setPlanDialog(null)} />
      )}

      {statsUserId && (
        <StudentStatsDialog userId={statsUserId} onClose={() => setStatsUserId(null)} />
      )}
    </>
  );
}

function SelectFilter({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-11 min-w-[10rem] rounded-full border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 focus:border-neutral-400 focus:outline-none",
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function PlanDialog({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState<SubscriptionPlan>(user.subscriptionPlan);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fullName = user.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
    : user.email;

  const mutation = useMutation({
    mutationFn: () => adminApi.setUserPlan(user.id, plan, reason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
    onError: (err) => setError((err as Error).message),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (plan === user.subscriptionPlan) {
      setError(t("admin.usersPage.planDialog.errorSamePlan"));
      return;
    }
    mutation.mutate();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-neutral-100 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-neutral-950">
              {t("admin.usersPage.planDialog.title")}
            </h3>
            <p className="mt-1 text-sm text-neutral-400 font-medium">{fullName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
            aria-label={t("admin.usersPage.planDialog.cancel")}
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {t("admin.usersPage.planDialog.currentPlan")}
            </label>
            <Badge variant={PLAN_VARIANT[user.subscriptionPlan]} className="rounded-full px-2.5 py-0.5">
              {planLabel(user.subscriptionPlan, t)}
            </Badge>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {t("admin.usersPage.planDialog.newPlan")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                    plan === p
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
                  )}
                >
                  {planLabel(p, t)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {t("admin.usersPage.planDialog.reason")}
            </label>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("admin.usersPage.planDialog.reasonPlaceholder")}
              maxLength={200}
              className="rounded-xl border-neutral-200"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200/60 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-full px-4"
          >
            {t("admin.usersPage.planDialog.cancel")}
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="rounded-full px-4 bg-neutral-900 text-white hover:bg-neutral-800 border-none">
            {mutation.isPending && <Spinner size="sm" className="text-white mr-1" />}
            {t("admin.usersPage.planDialog.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function StudentStatsDialog({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "student-stats", userId],
    queryFn: () => adminApi.studentStats(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!userId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-5xl h-[85vh] flex flex-col rounded-[32px] bg-white border border-neutral-100 shadow-[0_30px_70px_rgba(0,0,0,0.15)] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-neutral-100 bg-[#161719] text-white">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e676] to-[#00b0ff] shadow-md shadow-emerald-500/20">
              <svg className="size-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">
                {t("admin.usersPage.analyticsModal.title")}
              </h3>
              <p className="text-xs text-neutral-400">
                {t("admin.usersPage.analyticsModal.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <XMarkIcon className="size-5.5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto bg-[#f8f9fa] p-8">
          {isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-20">
              <Spinner size="lg" className="text-emerald-500 animate-spin" />
              <p className="text-sm font-semibold text-neutral-500">
                {t("admin.usersPage.analyticsModal.loading")}
              </p>
            </div>
          )}

          {error && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-20">
              <div className="size-12 rounded-full bg-rose-50 grid place-items-center text-rose-500">
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-neutral-900">
                {t("admin.usersPage.analyticsModal.loadFailedTitle")}
              </h4>
              <p className="text-sm text-neutral-500">{(error as Error).message}</p>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Profile Card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 shadow-sm">
                  <div className="flex flex-col items-center text-center pb-6 border-b border-neutral-100">
                    <Avatar
                      name={data.analytics.profileSummary.firstName || "Student"}
                      className="size-20 text-xl font-bold bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                    />
                    <h4 className="mt-4 text-lg font-bold text-neutral-900">
                      {data.analytics.profileSummary.firstName || ""} {data.analytics.profileSummary.lastName || ""}
                    </h4>
                    <p className="text-sm text-neutral-500">
                      {data.analytics.profileSummary.schoolName || t("parent.schoolNotSet")}
                    </p>
                    
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                        Level {data.analytics.profileSummary.level}
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                        {data.analytics.profileSummary.xp} XP
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                        {t("admin.usersPage.analyticsModal.gradeLabel", {
                          grade: data.analytics.profileSummary.grade,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="py-6 space-y-4 border-b border-neutral-100 text-sm">
                    {data.analytics.profileSummary.targetProfession && (
                      <div>
                        <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                          {t("admin.usersPage.analyticsModal.targetProfession")}
                        </span>
                        <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                          <svg className="size-4.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {data.analytics.profileSummary.targetProfession}
                        </span>
                      </div>
                    )}
                    {data.analytics.profileSummary.careerDirection && (
                      <div>
                        <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                          {t("admin.usersPage.analyticsModal.careerDirection")}
                        </span>
                        <span className="font-semibold text-neutral-800">{data.analytics.profileSummary.careerDirection}</span>
                      </div>
                    )}
                    <div>
                      <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        {t("admin.usersPage.analyticsModal.questsLabel")}
                      </span>
                      <span className="font-semibold text-neutral-800">
                        {t("admin.usersPage.analyticsModal.questsDone", {
                          done: data.analytics.completedQuests,
                          total: data.analytics.totalQuests,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Interests */}
                  <div className="pt-6">
                    <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      {t("admin.usersPage.analyticsModal.interestsLabel")}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {data.analytics.profileSummary.interests && data.analytics.profileSummary.interests.length > 0 ? (
                        data.analytics.profileSummary.interests.map((interest: string) => (
                          <span key={interest} className="px-2.5 py-1 rounded-xl bg-neutral-100 text-neutral-700 text-xs font-semibold">
                            {interest}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-400 italic">
                          {t("admin.usersPage.analyticsModal.notSpecified")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle and Right Column: Stats & AI */}
              <div className="lg:col-span-2 space-y-6">
                {/* Stats Performance card */}
                <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 shadow-sm">
                  <h4 className="text-base font-bold text-neutral-900 mb-5 flex items-center gap-2">
                    <svg className="size-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                    {t("admin.usersPage.analyticsModal.performanceTitle")}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.analytics.subjectScores && data.analytics.subjectScores.length > 0 ? (
                      data.analytics.subjectScores.map((subj: any) => (
                        <div key={subj.subject} className="space-y-1.5 p-3 rounded-2xl bg-neutral-50/50 border border-neutral-100">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-neutral-700">{subj.subject}</span>
                            <span className="text-neutral-900">{subj.score}%</span>
                          </div>
                          <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                subj.score >= 80 ? "bg-emerald-500" : subj.score >= 50 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${subj.score}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-400 italic text-center py-6 col-span-2">
                        {t("admin.usersPage.analyticsModal.scoresEmpty")}
                      </p>
                    )}
                  </div>
                </div>

                {/* AI Tutor analysis card */}
                <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 shadow-sm space-y-5">
                  <h4 className="text-base font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-4">
                    <svg className="size-5 text-violet-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {t("admin.usersPage.analyticsModal.aiReport")}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Student feedback */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          {t("admin.usersPage.analyticsModal.analysisStudent")}
                        </h5>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-100 h-[220px] overflow-y-auto text-xs leading-relaxed text-neutral-600 whitespace-pre-line">
                        {data.aiFeedback?.aiAnalysisStudent || t("admin.usersPage.analyticsModal.analysisNotGenerated")}
                      </div>
                    </div>

                    {/* Parent feedback */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          {t("admin.usersPage.analyticsModal.analysisParents")}
                        </h5>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-100 h-[220px] overflow-y-auto text-xs leading-relaxed text-neutral-600 whitespace-pre-line">
                        {data.aiFeedback?.aiAnalysisParent || t("admin.usersPage.analyticsModal.analysisParentsNotGenerated")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end items-center px-8 py-4 border-t border-neutral-100 bg-white gap-2">
          <Button variant="outline" className="rounded-full px-5" onClick={onClose}>
            {t("admin.usersPage.analyticsModal.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
