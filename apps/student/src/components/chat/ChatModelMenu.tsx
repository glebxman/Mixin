import { CheckIcon } from "@heroicons/react/24/outline";
import { motion } from "motion/react";
import { useI18n } from "@edtech/i18n";

export type ChatModel = "lite" | "omni" | "max";

export function getModelTitle(model: ChatModel, t: (key: string) => string): string {
  if (model === "max") return t("chat.modelMaxTitle");
  if (model === "omni") return t("chat.modelOmniTitle");
  return t("chat.modelLiteTitle");
}

export function ChatModelMenu({
  selectedModel,
  onSelect,
}: {
  selectedModel: ChatModel;
  onSelect: (model: ChatModel) => void;
}) {
  const { t } = useI18n();
  const proBadge = t("chat.modelBadgeProShort");

  return (
    <motion.div
      role="menu"
      className="absolute left-0 top-10 z-40 w-[334px] rounded-xl border border-neutral-200 bg-white p-2 "
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: "top left" }}
    >
      <ModelMenuItem
        model="max"
        title={t("chat.modelMaxTitle")}
        description={t("chat.modelMaxDesc")}
        badge={proBadge}
        selected={selectedModel === "max"}
        onSelect={onSelect}
      />
      <ModelMenuItem
        model="omni"
        title={t("chat.modelOmniTitle")}
        description={t("chat.modelOmniDesc")}
        badge={proBadge}
        selected={selectedModel === "omni"}
        onSelect={onSelect}
      />
      <ModelMenuItem
        model="lite"
        title={t("chat.modelLiteTitle")}
        description={t("chat.modelLiteDesc")}
        selected={selectedModel === "lite"}
        onSelect={onSelect}
      />
    </motion.div>
  );
}

function ModelMenuItem({
  model,
  title,
  description,
  badge,
  selected,
  onSelect,
}: {
  model: ChatModel;
  title: string;
  description: string;
  badge?: string;
  selected: boolean;
  onSelect: (model: ChatModel) => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={() => onSelect(model)}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-100"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium leading-5 text-neutral-950">
          {title}
          {badge && (
            <span className="rounded bg-[#6084ff]/15 px-1.5 py-0.5 text-xs font-semibold text-[#6084ff]">
              {badge}
            </span>
          )}
        </span>
        <span className="block text-xs leading-4 text-neutral-500">{description}</span>
      </span>
      {selected && <CheckIcon className="size-4 shrink-0 text-neutral-950" />}
    </button>
  );
}
