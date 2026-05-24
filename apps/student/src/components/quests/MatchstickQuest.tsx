import { useState, useEffect } from "react";
import { useI18n } from "@edtech/i18n";
import { ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";

interface MatchstickQuestProps {
  equation: string; // e.g. "5 - 3 = 8"
  task: string;
  hint?: string;
  onSuccess: (finalEquation: string) => void;
}

const DIGIT_SEGMENTS: Record<number, boolean[]> = {
  0: [true, true, true, true, true, true, false],
  1: [false, true, true, false, false, false, false],
  2: [true, true, false, true, true, false, true],
  3: [true, true, true, true, false, false, true],
  4: [false, true, true, false, false, true, true],
  5: [true, false, true, true, false, true, true],
  6: [true, false, true, true, true, true, true],
  7: [true, true, true, false, false, false, false],
  8: [true, true, true, true, true, true, true],
  9: [true, true, true, true, false, true, true],
};

function parseDigit(char: string): boolean[] {
  const num = parseInt(char, 10);
  if (!isNaN(num) && num >= 0 && num <= 9) {
    return [...DIGIT_SEGMENTS[num]];
  }
  return [false, false, false, false, false, false, false];
}

function decodeDigit(segments: boolean[]): number | null {
  for (const [numStr, segs] of Object.entries(DIGIT_SEGMENTS)) {
    if (segs.every((val, idx) => val === segments[idx])) {
      return parseInt(numStr, 10);
    }
  }
  return null;
}

export function MatchstickQuest({ equation, task, hint, onSuccess }: MatchstickQuestProps) {
  const { t } = useI18n();
  const [initialState, setInitialState] = useState<{
    d1: boolean[];
    op: boolean[];
    d2: boolean[];
    d3: boolean[];
  } | null>(null);

  const [d1, setD1] = useState<boolean[]>(Array(7).fill(false));
  const [op, setOp] = useState<boolean[]>(Array(2).fill(false)); // [horizontal, vertical]
  const [d2, setD2] = useState<boolean[]>(Array(7).fill(false));
  const [d3, setD3] = useState<boolean[]>(Array(7).fill(false));

  const [hand, setHand] = useState<{ symbol: string; index: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Initialize from equation string (e.g. "5 - 3 = 8")
  useEffect(() => {
    const clean = equation.replace(/\s+/g, "");
    const match = clean.match(/^(\d)([-+])(\d)=(\d)$/);
    if (match) {
      const [, first, operator, second, result] = match;
      const parsed = {
        d1: parseDigit(first),
        op: operator === "+" ? [true, true] : [true, false],
        d2: parseDigit(second),
        d3: parseDigit(result),
      };
      setInitialState(parsed);
      setD1(parsed.d1);
      setOp(parsed.op);
      setD2(parsed.d2);
      setD3(parsed.d3);
      setHand(null);
      setError(null);
      setSolved(false);
    }
  }, [equation]);

  const handleReset = () => {
    if (initialState) {
      setD1([...initialState.d1]);
      setOp([...initialState.op]);
      setD2([...initialState.d2]);
      setD3([...initialState.d3]);
      setHand(null);
      setError(null);
      setSolved(false);
    }
  };

  const handleSegmentClick = (symbol: "d1" | "op" | "d2" | "d3", index: number) => {
    if (solved) return;
    setError(null);

    const getSymbolState = () => {
      if (symbol === "d1") return { state: d1, set: setD1 };
      if (symbol === "op") return { state: op, set: setOp };
      if (symbol === "d2") return { state: d2, set: setD2 };
      return { state: d3, set: setD3 };
    };

    const { state, set } = getSymbolState();
    const hasMatchstick = state[index];

    if (hand === null) {
      // Pick up matchstick
      if (!hasMatchstick) return; // empty slot, nothing to pick up
      
      // Do not allow picking up the horizontal part of operator to ensure it remains a valid symbol (+ or -)
      if (symbol === "op" && index === 0) {
        setError(t("quests.matchstick.dontRemoveHorizontal"));
        return;
      }

      const nextState = [...state];
      nextState[index] = false;
      set(nextState);
      setHand({ symbol, index });
    } else {
      // Place matchstick
      if (hasMatchstick) return; // slot already occupied

      const nextState = [...state];
      nextState[index] = true;
      set(nextState);
      setHand(null);
    }
  };

  // Evaluate the equation
  const checkEquation = () => {
    if (hand !== null) {
      setError(t("quests.matchstick.placeInHand"));
      return;
    }

    const val1 = decodeDigit(d1);
    const val2 = decodeDigit(d2);
    const val3 = decodeDigit(d3);

    if (val1 === null || val2 === null || val3 === null) {
      setError(t("quests.matchstick.invalidDigits"));
      return;
    }

    const isPlus = op[1]; // [horizontal, vertical] -> true means plus
    const resultExpr = isPlus ? val1 + val2 : val1 - val2;
    const isCorrect = resultExpr === val3;

    const opChar = isPlus ? "+" : "-";
    const currentEqStr = `${val1} ${opChar} ${val2} = ${val3}`;

    if (isCorrect) {
      setSolved(true);
      onSuccess(currentEqStr);
    } else {
      setError(t("quests.matchstick.incorrectEquation", { eq: currentEqStr }));
    }
  };

  // Render 7-segment digit
  const renderDigit = (symbol: "d1" | "d2" | "d3", segments: boolean[]) => {
    // segment positions
    // index mapping: 0:a, 1:b, 2:c, 3:d, 4:e, 5:f, 6:g
    const segStyles = [
      { id: 0, className: "top-0 left-[8px] right-[8px] h-2 cursor-pointer" }, // a
      { id: 1, className: "top-[4px] right-0 w-2 bottom-1/2 cursor-pointer" }, // b
      { id: 2, className: "top-1/2 right-0 w-2 bottom-[4px] cursor-pointer" }, // c
      { id: 3, className: "bottom-0 left-[8px] right-[8px] h-2 cursor-pointer" }, // d
      { id: 4, className: "top-1/2 left-0 w-2 bottom-[4px] cursor-pointer" }, // e
      { id: 5, className: "top-[4px] left-0 w-2 bottom-1/2 cursor-pointer" }, // f
      { id: 6, className: "top-1/2 -mt-1 left-[8px] right-[8px] h-2 cursor-pointer" }, // g
    ];

    return (
      <div className="relative h-28 w-16 select-none bg-neutral-50/20 rounded-lg p-1">
        {segStyles.map((seg) => {
          const isActive = segments[seg.id];
          const isHorizontal = [0, 3, 6].includes(seg.id);
          return (
            <div
              key={seg.id}
              onClick={() => handleSegmentClick(symbol, seg.id)}
              className={`absolute transition-all duration-150 ${seg.className}`}
            >
              {isActive ? (
                // Matchstick
                <div
                  className={`w-full h-full rounded-md shadow-md transition-transform hover:scale-105 active:scale-95 ${
                    isHorizontal
                      ? "bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700"
                      : "bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700"
                  } relative`}
                >
                  {/* Matchstick Tip */}
                  <div
                    className={`absolute rounded-full bg-red-700 shadow-sm ${
                      isHorizontal
                        ? "top-1/2 -translate-y-1/2 right-[2px] w-2 h-2"
                        : "left-1/2 -translate-x-1/2 bottom-[2px] w-2 h-2"
                    }`}
                  />
                </div>
              ) : (
                // Empty placeholder
                <div
                  className={`w-full h-full border border-dashed border-neutral-300 rounded-md hover:border-amber-400 hover:bg-amber-50/10`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render operator (+ or -)
  const renderOperator = (segments: boolean[]) => {
    const isPlus = segments[1]; // index 1 is vertical line

    return (
      <div className="relative h-28 w-12 flex items-center justify-center select-none bg-neutral-50/10 rounded-lg">
        {/* Horizontal part (always active in equation) */}
        <div
          onClick={() => handleSegmentClick("op", 0)}
          className="absolute w-8 h-2 cursor-pointer"
        >
          {segments[0] ? (
            <div className="w-full h-full rounded-md shadow-md bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 relative">
              <div className="absolute rounded-full bg-red-700 right-[2px] top-1/2 -translate-y-1/2 w-2 h-2" />
            </div>
          ) : (
            <div className="w-full h-full border border-dashed border-neutral-300 rounded-md hover:border-amber-400" />
          )}
        </div>

        {/* Vertical part (can be added/removed to toggle +/-) */}
        <div
          onClick={() => handleSegmentClick("op", 1)}
          className="absolute h-8 w-2 cursor-pointer"
        >
          {isPlus ? (
            <div className="w-full h-full rounded-md shadow-md bg-gradient-to-b from-amber-50 via-amber-600 to-amber-700 relative">
              <div className="absolute rounded-full bg-red-700 bottom-[2px] left-1/2 -translate-x-1/2 w-2 h-2" />
            </div>
          ) : (
            <div className="w-full h-full border border-dashed border-neutral-300 rounded-md hover:border-amber-400 hover:bg-amber-50/10" />
          )}
        </div>
      </div>
    );
  };

  // Render static Equals Sign (=)
  const renderEquals = () => {
    return (
      <div className="relative h-28 w-12 flex flex-col gap-2.5 items-center justify-center select-none">
        <div className="w-8 h-2 rounded-md shadow-sm bg-gradient-to-r from-amber-600 to-amber-700 relative">
          <div className="absolute rounded-full bg-red-700 right-[2px] top-1/2 -translate-y-1/2 w-2 h-2" />
        </div>
        <div className="w-8 h-2 rounded-md shadow-sm bg-gradient-to-r from-amber-600 to-amber-700 relative">
          <div className="absolute rounded-full bg-red-700 right-[2px] top-1/2 -translate-y-1/2 w-2 h-2" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white border border-neutral-200/80 rounded-3xl shadow-sm space-y-6 max-w-full overflow-hidden">
      <div className="text-center space-y-2">
        <h4 className="text-base font-bold text-neutral-900">
          {t("quests.matchstick.title")}
        </h4>
        <p className="text-sm text-neutral-600 max-w-md">{task}</p>
      </div>

      {/* Playfield */}
      <div className="flex items-center gap-4 bg-neutral-50 border border-neutral-100 rounded-2xl p-6 overflow-x-auto max-w-full">
        {renderDigit("d1", d1)}
        {renderOperator(op)}
        {renderDigit("d2", d2)}
        {renderEquals()}
        {renderDigit("d3", d3)}
      </div>

      {/* Hand status */}
      <div className="flex flex-col items-center min-h-8">
        {hand ? (
          <div className="flex items-center gap-2 text-sm text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t("quests.matchstick.inHand")}
          </div>
        ) : (
          <div className="text-sm text-neutral-500">
            {t("quests.matchstick.howTo")}
          </div>
        )}
        {error && (
          <p className="mt-2 text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-4 py-1 rounded-full">
            {error}
          </p>
        )}
      </div>

      {/* Control panel */}
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
          onClick={checkEquation}
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
