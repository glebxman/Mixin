import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subscriptionApi } from "@edtech/api-client";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@edtech/i18n";
import { AnimatePresence, motion } from "motion/react";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { GeneralPanel } from "@/components/settings/panels/GeneralPanel";
import { AccountPanel } from "@/components/settings/panels/AccountPanel";
import { DataPanel } from "@/components/settings/panels/DataPanel";
import { PlaceholderPanel } from "@/components/settings/panels/PlaceholderPanel";
import type { SettingsSection, SubscriptionInfo } from "@/components/settings/nav";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
  userId?: string;
  userName: string;
  userEmail?: string;
  onAccountDeleted?: () => void;
  onUpgradeClick?: () => void;
}

export function SettingsModal({
  open,
  onClose,
  initialSection = "general",
  userId,
  userName,
  userEmail,
  onAccountDeleted,
  onUpgradeClick,
}: SettingsModalProps) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const { t } = useI18n();

  const { data: subInfo } = useQuery<SubscriptionInfo>({
    queryKey: ["subscription", "info"],
    queryFn: () => subscriptionApi.getInfo() as Promise<SubscriptionInfo>,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setSection(initialSection);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, initialSection]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-10 backdrop-blur-[2px]"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="flex h-full max-h-[640px] w-full max-w-[920px] overflow-hidden rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <SettingsSidebar
              active={section}
              onSelect={setSection}
              userName={userName}
              userEmail={userEmail}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-100 px-7">
                <h2 className="text-base font-medium text-neutral-950">
                  {t(`settings.nav.${section}`)}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("common.close")}
                  className="grid size-8 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
                >
                  <XMarkIcon className="size-5" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-7 py-6">
                {section === "general" && <GeneralPanel />}
                {section === "account" && (
                  <AccountPanel
                    userId={userId}
                    userName={userName}
                    userEmail={userEmail}
                    onAccountDeleted={onAccountDeleted}
                    onUpgradeClick={onUpgradeClick}
                    subInfo={subInfo}
                  />
                )}
                {section === "billing" && <PlaceholderPanel sectionKey="billing" />}
                {section === "personalization" && (
                  <PlaceholderPanel sectionKey="personalization" />
                )}
                {section === "mail" && <PlaceholderPanel sectionKey="mail" />}
                {section === "data" && <DataPanel />}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
