import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parentApi } from "@edtech/api-client";
import { EmptyState, ErrorState, LoadingState, Spinner } from "@edtech/ui";
import { LinkIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@edtech/i18n";
import { ChildSelector } from "@/components/ChildSelector";
import { ChildOverview } from "@/components/ChildOverview";

export function DashboardPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState("");

  const childrenQuery = useQuery({
    queryKey: ["parent", "children"],
    queryFn: () => parentApi.children(),
  });

  useEffect(() => {
    if (!selectedId && childrenQuery.data?.[0]?.id) {
      setSelectedId(childrenQuery.data[0].id);
    }
  }, [childrenQuery.data, selectedId]);

  const overviewQuery = useQuery({
    queryKey: ["parent", "child", selectedId],
    queryFn: () => parentApi.childOverview(selectedId!),
    enabled: !!selectedId,
  });

  const linkMutation = useMutation({
    mutationFn: (code: string) => parentApi.linkChild(code),
    onSuccess: (child) => {
      setLinkCode("");
      setSelectedId(child.id);
      queryClient.invalidateQueries({ queryKey: ["parent", "children"] });
      queryClient.invalidateQueries({ queryKey: ["parent", "child", child.id] });
    },
  });

  if (childrenQuery.isLoading) {
    return <LoadingState label={t("parent.loadingChildren")} />;
  }
  if (childrenQuery.error) {
    return (
      <ErrorState
        title={t("common.error")}
        message={(childrenQuery.error as Error).message}
      />
    );
  }

  const children = childrenQuery.data ?? [];
  const hasChildren = children.length > 0;

  return (
    <>
      <LinkChildPanel
        code={linkCode}
        onCodeChange={setLinkCode}
        isPending={linkMutation.isPending}
        error={linkMutation.error}
        onSubmit={() => linkMutation.mutate(linkCode)}
      />

      {!hasChildren ? (
        <EmptyState
          title={t("parent.noChildrenTitle")}
          description={t("parent.noChildrenDesc")}
          icon={UserGroupIcon}
        />
      ) : (
        <>
          <ChildSelector
            children={children}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {overviewQuery.isLoading && (
            <div className="flex justify-center py-12">
              <Spinner className="text-neutral-700" />
            </div>
          )}
          {overviewQuery.error && (
            <ErrorState
              title={t("common.error")}
              message={(overviewQuery.error as Error).message}
            />
          )}
          {overviewQuery.data && <ChildOverview overview={overviewQuery.data} />}
        </>
      )}
    </>
  );
}

function LinkChildPanel({
  code,
  onCodeChange,
  isPending,
  error,
  onSubmit,
}: {
  code: string;
  onCodeChange: (value: string) => void;
  isPending: boolean;
  error: unknown;
  onSubmit: () => void;
}) {
  const { t } = useI18n();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (code.trim()) onSubmit();
      }}
      className="rounded-[28px] border border-[#d9d9d1] bg-[#eeeee5] p-5"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <LinkIcon className="size-5 text-[#089567]" />
            <h2 className="text-xl font-semibold text-[#151614]">
              {t("parent.linkChildTitle")}
            </h2>
          </div>
          <p className="text-sm text-[#666760]">{t("parent.linkChildDesc")}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <input
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            placeholder={t("parent.linkCodePlaceholder")}
            className="h-12 min-w-0 rounded-full border border-[#d4d4ca] bg-white px-5 text-sm font-medium text-[#151614] outline-none transition focus:border-[#3d3e3a] sm:w-[360px]"
          />
          <button
            type="submit"
            disabled={isPending || !code.trim()}
            className="h-12 rounded-full bg-[#3d3e3a] px-6 text-sm font-semibold text-white transition hover:bg-[#252621] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? t("parent.linking") : t("parent.linkAction")}
          </button>
        </div>
      </div>
      {Boolean(error) && (
        <p className="mt-3 text-sm text-[#e92554]">{(error as Error).message}</p>
      )}
    </form>
  );
}
