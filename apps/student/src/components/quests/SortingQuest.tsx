import { useState, useCallback } from "react";
import { useI18n } from "@edtech/i18n";
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface SortingQuestProps {
  task: string;
  /** Items in the CORRECT order — component will shuffle them */
  items: string[];
  hint?: string;
  onSuccess: (answer: string) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function SortingQuest({ task, items, hint, onSuccess }: SortingQuestProps) {
  const { t } = useI18n();
  const [correctOrder] = useState(() => [...items]);
  const [current, setCurrent] = useState<string[]>(() => {
    let s = shuffle(items);
    // ensure shuffled order differs from correct
    while (s.every((v, i) => v === items[i]) && items.length > 1) {
      s = shuffle(items);
    }
    return s;
  });
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const moveUp = useCallback(
    (idx: number) => {
      if (idx === 0 || solved) return;
      setCurrent((c) => {
        const next = [...c];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        return next;
      });
      setError(null);
    },
    [solved],
  );

  const moveDown = useCallback(
    (idx: number) => {
      if (solved) return;
      setCurrent((c) => {
        if (idx >= c.length - 1) return c;
        const next = [...c];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      });
      setError(null);
    },
    [solved],
  );

  const handleReset = () => {
    let s = shuffle(items);
    while (s.every((v, i) => v === items[i]) && items.length > 1) {
      s = shuffle(items);
    }
    setCurrent(s);
    setSolved(false);
    setError(null);
  };

  const checkAnswer = () => {
    const isCorrect = current.every((v, i) => v === correctOrder[i]);
    if (isCorrect) {
      setSolved(true);
      onSuccess(current.join(" → "));
    } else {
      setError(t("quests.sorting.incorrect"));
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white border border-neutral-200/80 rounded-3xl shadow-sm space-y-5 max-w-full overflow-hidden">
      <div className="text-center space-y-2">
        <h4 className="text-base font-bold text-neutral-900">
          {t("quests.sorting.title")}
        </h4>
        <p className="text-sm text-neutral-600 max-w-md">{task}</p>
      </div>

      {/* Sorting list */}
      <div className="w-full max-w-md space-y-2">
        {current.map((item, idx) => (
          <div
            key={`${item}-${idx}`}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
              solved
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-neutral-200 bg-neutral-50/50 hover:border-neutral-300"
            }`}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-200/60 text-xs font-bold text-neutral-600">
              {idx + 1}
            </span>
            <span className="flex-1 text-sm text-neutral-900 font-medium leading-snug">
              {item}
            </span>
            {!solved && (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="rounded p-0.5 text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-800 disabled:opacity-30 transition"
                >
                  <ChevronUpIcon className="size-4 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === current.length - 1}
                  className="rounded p-0.5 text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-800 disabled:opacity-30 transition"
                >
                  <ChevronDownIcon className="size-4 stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-4 py-1 rounded-full">
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between w-full border-t border-neutral-100 pt-4 gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <ArrowPathIcon className="size-3.5" />
            {t("common.reset")}
          </button>
          {hint && (
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              {showHint ? t("common.hideHint") : t("common.showHint")}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={checkAnswer}
          disabled={solved}
          className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold text-white transition-colors ${
            solved
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-neutral-900 hover:bg-neutral-800"
          }`}
        >
          {solved ? (
            <>
              <CheckIcon className="size-3.5 stroke-[2.5]" />
              {t("common.solved")}
            </>
          ) : (
            t("common.check")
          )}
        </button>
      </div>

      {showHint && hint && (
        <div className="w-full bg-amber-50/50 border border-amber-100/70 rounded-2xl p-4 text-xs leading-relaxed text-amber-900">
          <strong>{t("common.hint")}:</strong> {hint}
        </div>
      )}
    </div>
  );
}
