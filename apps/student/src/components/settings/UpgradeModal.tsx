import { useEffect, useMemo, useState, useRef } from "react";
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

// Custom hook to animate number values smoothly with a cubic ease-out curve
function useAnimatedNumber(targetValue: number, duration: number = 350) {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      setCurrentValue(targetValue);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = currentValue;
    const diff = targetValue - startValue;

    if (diff === 0) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCurrentValue(Math.round(startValue + diff * easeProgress));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, duration]);

  return currentValue;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { t } = useI18n();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
  const isAnnually = billingCycle === "annually";
  const [selectedCredits, setSelectedCredits] = useState(8000);
  const price = useMemo(() => creditPlanPrice(selectedCredits), [selectedCredits]);

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
            className="relative flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl bg-white border border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800"
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
              className="absolute right-5 top-5 z-10 grid size-8 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-850 dark:hover:text-neutral-100"
            >
              <XMarkIcon className="size-5" />
            </button>

            <div className="overflow-y-auto px-8 pb-8 pt-10">
              <h2 className="text-center text-2xl font-semibold text-neutral-950 dark:text-neutral-50">
                {t("upgrade.mixinTariffs")}
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                {t("upgrade.creditsExplanation")}
              </p>

              {/* Billing Cycle Switch Switcher */}
              <div className="mt-6 flex justify-center">
                <div className="inline-flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-900 border border-neutral-200/40 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={cn(
                      "rounded-full px-5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200",
                      billingCycle === "monthly"
                        ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    )}
                  >
                    {t("upgrade.monthly")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annually")}
                    className={cn(
                      "rounded-full px-5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200",
                      billingCycle === "annually"
                        ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    )}
                  >
                    {t("upgrade.annually")}
                  </button>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <PlanCard
                  title="Free"
                  price={0}
                  isAnnually={isAnnually}
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
                  price={isAnnually ? Math.round(price * 0.8) : price}
                  isAnnually={isAnnually}
                  subtitle={t("upgrade.priceDepends")}
                  buttonLabel={t("upgrade.selectCredits")}
                  highlighted
                  selector={
                    <CreditsSelector
                      value={selectedCredits}
                      onChange={setSelectedCredits}
                      options={CREDIT_OPTIONS}
                      isAnnually={isAnnually}
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
                  price={isAnnually ? Math.round(129000 * 0.8) : 129000}
                  isAnnually={isAnnually}
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
  isAnnually,
}: {
  title: string;
  price: number;
  subtitle: string;
  buttonLabel: string;
  highlighted?: boolean;
  selector?: React.ReactNode;
  features: string[];
  isAnnually: boolean;
}) {
  const { t } = useI18n();
  const animatedPrice = useAnimatedNumber(price);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-6 transition-all duration-300",
        highlighted
          ? "border-[#6084ff] ring-1 ring-[#6084ff] bg-white dark:bg-neutral-900/40"
          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/20",
      )}
    >
      <div className="mb-1 flex flex-wrap items-baseline gap-1.5">
        <span className="text-2xl font-bold text-neutral-950 dark:text-neutral-50">
          {animatedPrice === 0 ? "0" : animatedPrice.toLocaleString("ru-RU")}
          {t("upgrade.currency", { value: "" })}
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {isAnnually ? t("upgrade.billedYearly") : t("upgrade.creditsPerMonth")}
        </span>
      </div>
      <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">{title}</h3>
      <p className="mb-5 mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>

      <button
        type="button"
        className={cn(
          "mb-4 w-full rounded-full py-2.5 text-sm font-medium transition-colors",
          highlighted
            ? "bg-[#6084ff] text-white hover:bg-[#5276f4]"
            : "bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700",
        )}
      >
        {buttonLabel}
      </button>

      {selector && <div className="mb-4">{selector}</div>}

      <ul className="space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-neutral-800 dark:text-neutral-200">
            {feature.toLowerCase().includes("квест") ||
            feature.toLowerCase().includes("quest") ||
            feature.toLowerCase().includes("kvest") ? (
              <PuzzlePieceIcon className="mt-0.5 size-4 shrink-0 text-neutral-700 dark:text-neutral-300 stroke-[1.8]" />
            ) : feature.toLowerCase().includes("тест") ||
              feature.toLowerCase().includes("test") ? (
              <ClipboardDocumentCheckIcon className="mt-0.5 size-4 shrink-0 text-neutral-700 dark:text-neutral-300 stroke-[1.8]" />
            ) : (
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-neutral-700 dark:text-neutral-300 stroke-[1.8]" />
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
  isAnnually,
}: {
  value: number;
  onChange: (next: number) => void;
  options: number[];
  isAnnually: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const formatPrice = (val: number) => {
    const finalVal = isAnnually ? Math.round(val * 0.8) : val;
    return t("upgrade.currency", { value: finalVal.toLocaleString("ru-RU") });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-lg bg-neutral-100 px-3.5 py-2.5 text-sm transition-colors hover:bg-neutral-200/70 dark:bg-neutral-800 dark:hover:bg-neutral-700"
      >
        <span className="text-neutral-900 dark:text-neutral-100">
          <span className="font-semibold">{formatCredits(value)}</span>{" "}
          <span className="text-neutral-600 dark:text-neutral-400">{t("upgrade.creditsImmediate")}</span>
        </span>
        {open ? (
          <ChevronUpIcon className="size-4 text-neutral-500 dark:text-neutral-400" />
        ) : (
          <ChevronDownIcon className="size-4 text-neutral-500 dark:text-neutral-400" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-[260px] overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1.5 dark:bg-neutral-900 dark:border-neutral-800">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800",
                option === value && "bg-neutral-100 dark:bg-neutral-800",
              )}
            >
              <span className="text-neutral-900 dark:text-neutral-100">
                <span className="font-semibold">{formatCredits(option)}</span>{" "}
                <span className="text-neutral-600 dark:text-neutral-400">{t("upgrade.creditsCount")}</span>
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatPrice(creditPlanPrice(option))}</span>
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
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:bg-neutral-900/40 dark:border-neutral-800">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
        <Icon className="size-5 text-neutral-700 dark:text-neutral-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-950 dark:text-neutral-200">{title}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{value}</p>
      </div>
    </div>
  );
}
