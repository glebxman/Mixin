import { useState } from "react";
import { useI18n } from "@edtech/i18n";
import { studentApi } from "@edtech/api-client";
import { MatchstickQuest } from "./MatchstickQuest";
import { ScratchQuest } from "./ScratchQuest";
import { StarIcon } from "@heroicons/react/24/solid";

interface QuestRunnerProps {
  code: string;
}

export function QuestRunner({ code }: QuestRunnerProps) {
  const { t } = useI18n();
  const [solved, setSolved] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let parsed: any = null;
  try {
    parsed = JSON.parse(code);
  } catch (err) {
    // If it's not valid JSON, just display as a code block.
    return (
      <pre className="my-4 overflow-x-auto rounded-xl bg-neutral-50 p-4 text-[13px] leading-6 text-neutral-900">
        {code}
      </pre>
    );
  }

  if (!parsed || (parsed.type !== "matchstick" && parsed.type !== "scratch")) {
    return (
      <pre className="my-4 overflow-x-auto rounded-xl bg-neutral-50 p-4 text-[13px] leading-6 text-neutral-900">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  }

  const handleQuestSuccess = async (answerPayload: string) => {
    setSolved(true);
    setLoading(true);
    setError(null);

    try {
      const isMatchstick = parsed.type === "matchstick";
      const subject = isMatchstick ? "Математика / Логика" : "Информатика / Scratch";
      const title = isMatchstick
        ? t("quests.matchstick.shortTitle", "Логическая головоломка со спичками")
        : t("quests.scratch.shortTitle", "Алгоритмический квест Scratch");

      const questionPrompt = isMatchstick
        ? `Переложите спичку: ${parsed.equation}`
        : ` Scratch алгоритм: ${parsed.task}`;

      // Call backend completeAiQuest to award XP and save progress
      const result = await studentApi.completeAiQuest({
        title,
        subject,
        gradeBand: "all",
        totalQuestions: 1,
        correctAnswers: 1,
        answers: [answerPayload],
        questions: [
          {
            type: isMatchstick ? "matchstick" : "logic",
            q: questionPrompt,
            answer: answerPayload,
            explanation: parsed.explanation || "Квест успешно выполнен учеником.",
          },
        ],
      });

      setXpAwarded(result?.xpEarned || 50);
    } catch (err: any) {
      console.error("Failed to submit AI Quest completion:", err);
      // Fallback XP if API errors or we want offline-ready experience
      setXpAwarded(50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-6 relative border border-neutral-100 rounded-3xl bg-neutral-50/30 p-2 sm:p-4 shadow-sm max-w-full overflow-hidden">
      {parsed.type === "matchstick" && (
        <MatchstickQuest
          equation={parsed.equation || "5 - 3 = 8"}
          task={parsed.task || t("quests.matchstick.defaultTask", "Переложите одну спичку так, чтобы равенство стало верным.")}
          hint={parsed.hint}
          onSuccess={handleQuestSuccess}
        />
      )}

      {parsed.type === "scratch" && (
        <ScratchQuest
          task={parsed.task || t("quests.scratch.defaultTask", "Помоги роботу дойти до финиша.")}
          grid={parsed.grid || [["E", "S"], ["R", "E"]]}
          robotPos={parsed.robotPos || [1, 0]}
          robotDirection={parsed.robotDirection || "right"}
          targetPos={parsed.targetPos || [0, 1]}
          hint={parsed.hint}
          onSuccess={handleQuestSuccess}
        />
      )}

      {/* Solving Overlay & Success Popup */}
      {solved && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm transition-all duration-300 animate-fade-in">
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 max-w-xs text-center shadow-xl space-y-4 transform scale-100 transition-transform">
            <div className="flex justify-center">
              <div className="relative">
                <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 animate-bounce">
                  <StarIcon className="size-8 stroke-[2.5]" />
                </div>
                <div className="absolute -top-1 -right-1 size-4 bg-amber-400 rounded-full animate-ping" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h5 className="text-lg font-bold text-neutral-900">
                {t("quests.successTitle", "Квест пройден!")}
              </h5>
              <p className="text-xs text-neutral-500">
                {t("quests.successDesc", "Отличная работа! Твои навыки растут.")}
              </p>
            </div>

            {loading ? (
              <div className="text-xs text-neutral-400 font-semibold animate-pulse py-2">
                {t("quests.saving", "Сохраняем прогресс...")}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-xs font-bold text-amber-800">
                ⭐ +{xpAwarded ?? 50} XP
              </div>
            )}

            {error && (
              <div className="text-[11px] text-red-600">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
