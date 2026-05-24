import { useState } from "react";
import {
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Avatar, cn } from "@edtech/ui";
import { useI18n } from "@edtech/i18n";
import { AnimatePresence } from "motion/react";
import { DeleteConfirmDialog } from "@/components/settings/dialogs/DeleteConfirmDialog";
import type { SubscriptionInfo } from "@/components/settings/nav";

export function AccountPanel({
  userId: providedUserId,
  userName,
  userEmail,
  onAccountDeleted,
  onUpgradeClick,
  subInfo,
}: {
  userId?: string;
  userName: string;
  userEmail?: string;
  onAccountDeleted?: () => void;
  onUpgradeClick?: () => void;
  subInfo?: SubscriptionInfo;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const userId = providedUserId || "—";

  function planLabel(plan: string | undefined): string {
    if (plan === "PREMIUM") return t("plans.quests");
    if (plan === "BASIC") return t("plans.credits");
    return t("plans.free");
  }

  async function handleCopy() {
    if (!providedUserId) return;
    try {
      await navigator.clipboard.writeText(providedUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  }

  function handleDeleteAccount() {
    setDeleteConfirm(false);
    if (onAccountDeleted) {
      onAccountDeleted();
    } else {
      alert(t("settings.account.deleteAccountSoon"));
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <Avatar name={userName} size="lg" />
          <div className="flex-1">
            <label className="mb-1.5 block text-xs text-neutral-500">
              {t("settings.account.fullName")}
            </label>
            <input
              type="text"
              defaultValue={userName}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-950 transition-colors hover:border-neutral-300 focus:border-neutral-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <span className="text-base font-medium text-neutral-950">
              {planLabel(subInfo?.plan)}
            </span>
            {subInfo?.plan !== "PREMIUM" && (
              <button
                type="button"
                onClick={() => onUpgradeClick?.()}
                className="rounded-full bg-neutral-950 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              >
                {t("settings.account.upgrade")}
              </button>
            )}
          </div>
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <SparklesIcon className="mt-0.5 size-4 text-neutral-700" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-neutral-950">
                      {t("settings.account.credits")}
                    </span>
                    <QuestionMarkCircleIcon className="size-3.5 text-neutral-400" />
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {t("upgrade.creditsPerDay")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-950">
                  {subInfo ? subInfo.remainingCredits : "..."}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {subInfo
                    ? `/ ${subInfo.limits.dailyCredits} ${t("settings.account.perDay")}`
                    : t("settings.account.perDay")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <CalendarDaysIcon className="mt-0.5 size-4 text-neutral-700" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-neutral-950">
                      {t("settings.account.generationCost")}
                    </span>
                    <QuestionMarkCircleIcon className="size-3.5 text-neutral-400" />
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {t("settings.account.generationCostDesc")}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-neutral-950">
                {subInfo
                  ? subInfo.plan === "FREE"
                    ? t("settings.account.freePlanScope")
                    : planLabel(subInfo.plan)
                  : t("settings.account.freePlanScope")}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-neutral-950">
            {t("settings.account.email")}
          </p>
          <p className="text-sm text-neutral-500">{userEmail || "—"}</p>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm font-medium text-neutral-950">
              {t("settings.account.userId")}
            </p>
            <p className="truncate text-sm text-neutral-500">{userId}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "rounded-lg border bg-white px-4 py-1.5 text-sm font-medium transition-colors",
              copied
                ? "border-emerald-200 text-emerald-700"
                : "border-neutral-200 text-neutral-700 hover:bg-neutral-50",
            )}
          >
            {copied ? t("settings.account.copied") : t("settings.account.copy")}
          </button>
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-neutral-100 pt-5">
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-950">
              {t("settings.account.deleteAccount")}
            </p>
            <p className="text-sm text-neutral-500">
              {t("settings.account.deleteAccountDesc")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="rounded-lg border border-[#e92554]/25 bg-white px-4 py-1.5 text-sm font-medium text-[#e92554] transition-colors hover:bg-[#e92554]/10"
          >
            {t("settings.account.deleteAccount")}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {deleteConfirm && (
          <DeleteConfirmDialog
            onCancel={() => setDeleteConfirm(false)}
            onConfirm={handleDeleteAccount}
          />
        )}
      </AnimatePresence>
    </>
  );
}
