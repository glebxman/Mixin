import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  XMarkIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  PhotoIcon,
  VideoCameraIcon,
  PuzzlePieceIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@edtech/ui";
import { useI18n } from "@edtech/i18n";
import { AnimatePresence, motion } from "motion/react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const CREDIT_OPTIONS = [1000, 2000, 4000, 8000, 12000, 16000, 24000, 40000, 80000];

function formatCredits(value: number) {
  return value.toLocaleString("ru-RU");
}

function creditPlanPrice(credits: number) {
  return 49_000 + Math.max(0, Math.ceil((credits - 1000) / 4000) * 15_000);
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { t } = useI18n();
  const [selectedCredits, setSelectedCredits] = useState(8000);
  const price = useMemo(() => creditPlanPrice(selectedCredits), [selectedCredits]);

  const formatPrice = (value: number) => {
    return t("upgrade.currency", { value: value.toLocaleString("ru-RU") });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-[2px]"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl bg-white"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t("upgrade.closeLabel")}
              className="absolute right-5 top-5 z-10 grid size-8 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
            >
              <XMarkIcon className="size-5" />
            </button>

            <div className="overflow-y-auto px-8 pb-8 pt-10">
              <h2 className="text-center text-2xl font-semibold text-neutral-950">
                {t("upgrade.mixinTariffs")}
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-6 text-neutral-500">
                {t("upgrade.creditsExplanation")}
              </p>

              <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <PlanCard
                  title="Free"
                  price={formatPrice(0)}
                  subtitle={t("upgrade.forStart")}
                  buttonLabel={t("upgrade.currentTariff")}
                  features={[
                    t("upgrade.creditsPerDay"),
                    t("upgrade.testsOnly"),
                    t("upgrade.tutorChat"),
                    t("upgrade.noQuests"),
                  ]}
                />

                <PlanCard
                  title="Credits"
                  price={formatPrice(price)}
                  subtitle={t("upgrade.priceDepends")}
                  buttonLabel={t("upgrade.selectCredits")}
                  highlighted
                  selector={
                    <CreditsSelector
                      value={selectedCredits}
                      onChange={setSelectedCredits}
                      options={CREDIT_OPTIONS}
                    />
                  }
                  features={[
                    t("upgrade.creditsPerDayVal", { count: 500 }),
                    t("upgrade.creditsAfterPurchase", { credits: formatCredits(selectedCredits) }),
                    t("upgrade.costDepends"),
                    t("upgrade.imageCost"),
                    t("upgrade.videoCost"),
                    t("upgrade.questsNotIncluded"),
                  ]}
                />

                <PlanCard
                  title="Quests"
                  price={formatPrice(129000)}
                  subtitle={t("upgrade.forFullEducation")}
                  buttonLabel={t("upgrade.enableQuests")}
                  features={[
                    t("upgrade.creditsPerDayVal", { count: 500 }),
                    t("upgrade.questsIncluded"),
                    t("upgrade.profQuests"),
                    t("upgrade.testsIncluded"),
                    t("upgrade.imageCost"),
                    t("upgrade.videoCost"),
                  ]}
                />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <CostCard icon={SparklesIcon} title={t("upgrade.chatCard")} value={t("upgrade.oneCredit")} />
                <CostCard icon={PhotoIcon} title={t("upgrade.imageCard")} value={t("upgrade.creditsCountVal", { count: 50 })} />
                <CostCard icon={VideoCameraIcon} title={t("upgrade.videoCard")} value={t("upgrade.creditsCountVal", { count: 300 })} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlanCard({
  title,
  price,
  subtitle,
  buttonLabel,
  highlighted,
  selector,
  features,
}: {
  title: string;
  price: string;
  subtitle: string;
  buttonLabel: string;
  highlighted?: boolean;
  selector?: React.ReactNode;
  features: string[];
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-white p-6",
        highlighted ? "border-[#6084ff] ring-1 ring-[#6084ff]" : "border-neutral-200",
      )}
    >
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-neutral-950">{price}</span>
        <span className="text-sm text-neutral-500">{t("upgrade.creditsPerMonth")}</span>
      </div>
      <h3 className="text-base font-semibold text-neutral-950">{title}</h3>
      <p className="mb-5 mt-1 text-sm text-neutral-500">{subtitle}</p>

      <button
        type="button"
        className={cn(
          "mb-4 w-full rounded-full py-2.5 text-sm font-medium transition-colors",
          highlighted
            ? "bg-[#6084ff] text-white hover:bg-[#5276f4]"
            : "bg-neutral-950 text-white hover:bg-neutral-800",
        )}
      >
        {buttonLabel}
      </button>

      {selector && <div className="mb-4">{selector}</div>}

      <ul className="space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-neutral-800">
            {feature.toLowerCase().includes("квест") ||
            feature.toLowerCase().includes("quest") ||
            feature.toLowerCase().includes("kvest") ? (
              <PuzzlePieceIcon className="mt-0.5 size-4 shrink-0 text-neutral-700 stroke-[1.8]" />
            ) : feature.toLowerCase().includes("тест") ||
              feature.toLowerCase().includes("test") ? (
              <ClipboardDocumentCheckIcon className="mt-0.5 size-4 shrink-0 text-neutral-700 stroke-[1.8]" />
            ) : (
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-neutral-700 stroke-[1.8]" />
            )}
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreditsSelector({
  value,
  onChange,
  options,
}: {
  value: number;
  onChange: (next: number) => void;
  options: number[];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const formatPrice = (val: number) => {
    return t("upgrade.currency", { value: val.toLocaleString("ru-RU") });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-lg bg-neutral-100 px-3.5 py-2.5 text-sm transition-colors hover:bg-neutral-200/70"
      >
        <span>
          <span className="font-semibold text-neutral-950">{formatCredits(value)}</span>{" "}
          <span className="text-neutral-600">{t("upgrade.creditsImmediate")}</span>
        </span>
        {open ? (
          <ChevronUpIcon className="size-4 text-neutral-500" />
        ) : (
          <ChevronDownIcon className="size-4 text-neutral-500" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-[260px] overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1.5">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-neutral-50",
                option === value && "bg-neutral-100",
              )}
            >
              <span>
                <span className="font-semibold text-neutral-950">{formatCredits(option)}</span>{" "}
                <span className="text-neutral-600">{t("upgrade.creditsCount")}</span>
              </span>
              <span className="text-xs text-neutral-500">{formatPrice(creditPlanPrice(option))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CostCard({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-100">
        <Icon className="size-5 text-neutral-700" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-950">{title}</p>
        <p className="text-xs text-neutral-500">{value}</p>
      </div>
    </div>
  );
}
