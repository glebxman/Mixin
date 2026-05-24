import { useState, useEffect, useRef } from "react";
import { useI18n } from "@edtech/i18n";
import { ArrowPathIcon, CheckIcon, PlayIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ScratchQuestProps {
  task: string;
  grid: string[][]; // e.g. [["E","E","E"], ["E","S","E"], ["R","E","E"]]
  robotPos: [number, number]; // [row, col]
  robotDirection?: "up" | "right" | "down" | "left";
  targetPos: [number, number]; // [row, col]
  hint?: string;
  onSuccess: (code: string) => void;
}

type Direction = "up" | "right" | "down" | "left";

interface RobotState {
  pos: [number, number];
  dir: Direction;
  status: "idle" | "moving" | "success" | "crashed";
}

export function ScratchQuest({
  task,
  grid,
  robotPos,
  robotDirection = "right",
  targetPos,
  hint,
  onSuccess,
}: ScratchQuestProps) {
  const { t } = useI18n();

  // Program workspace blocks
  const [workspace, setWorkspace] = useState<string[]>([]);
  
  // Simulation robot state
  const [robot, setRobot] = useState<RobotState>({
    pos: [...robotPos] as [number, number],
    dir: robotDirection,
    status: "idle",
  });

  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset simulation when workspace or parameters change
  useEffect(() => {
    resetRobot();
    setSolved(false);
    setError(null);
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, [grid, robotPos, robotDirection]);

  const resetRobot = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setRobot({
      pos: [...robotPos] as [number, number],
      dir: robotDirection,
      status: "idle",
    });
    setActiveBlockIndex(null);
    setError(null);
  };

  const addBlock = (blockType: string) => {
    if (robot.status !== "idle" || solved) return;
    setWorkspace((w) => [...w, blockType]);
  };

  const removeBlock = (index: number) => {
    if (robot.status !== "idle" || solved) return;
    setWorkspace((w) => w.filter((_, idx) => idx !== index));
  };

  const clearWorkspace = () => {
    if (robot.status !== "idle" || solved) return;
    setWorkspace([]);
  };

  // Run simulation
  const runSimulation = () => {
    if (workspace.length === 0) {
      setError(t("quests.scratch.emptyWorkspace", "Добавьте блоки движения в рабочую область."));
      return;
    }

    resetRobot();
    setError(null);
    setRobot((r) => ({ ...r, status: "moving" }));

    let currentPos = [...robotPos] as [number, number];
    let currentDir = robotDirection;
    let step = 0;

    simulationIntervalRef.current = setInterval(() => {
      if (step >= workspace.length) {
        // Finished all blocks
        clearInterval(simulationIntervalRef.current!);
        simulationIntervalRef.current = null;
        setActiveBlockIndex(null);

        // Check if robot is on target
        if (currentPos[0] === targetPos[0] && currentPos[1] === targetPos[1]) {
          setRobot((r) => ({ ...r, status: "success" }));
          setSolved(true);
          onSuccess(workspace.join(","));
        } else {
          setRobot((r) => ({ ...r, status: "idle" }));
          setError(t("quests.scratch.didNotReach", "Робот остановился, но не дошел до звездочки. Попробуйте еще раз!"));
        }
        return;
      }

      const block = workspace[step];
      setActiveBlockIndex(step);

      // Perform move/turn
      if (block === "move") {
        let [row, col] = currentPos;
        if (currentDir === "up") row -= 1;
        else if (currentDir === "down") row += 1;
        else if (currentDir === "left") col -= 1;
        else if (currentDir === "right") col += 1;

        // Check bounds & obstacles
        const numRows = grid.length;
        const numCols = grid[0]?.length ?? 0;

        if (row < 0 || row >= numRows || col < 0 || col >= numCols || grid[row][col] === "X") {
          // Crashed!
          clearInterval(simulationIntervalRef.current!);
          simulationIntervalRef.current = null;
          setRobot({
            pos: [row, col],
            dir: currentDir,
            status: "crashed",
          });
          setError(t("quests.scratch.crashed", "Ой! Робот врезался в препятствие или вышел за край!"));
          return;
        }

        currentPos = [row, col];
      } else if (block === "turn_left") {
        const dirs: Direction[] = ["up", "left", "down", "right"];
        const idx = dirs.indexOf(currentDir);
        currentDir = dirs[(idx + 1) % 4];
      } else if (block === "turn_right") {
        const dirs: Direction[] = ["up", "right", "down", "left"];
        const idx = dirs.indexOf(currentDir);
        currentDir = dirs[(idx + 1) % 4];
      }

      setRobot({
        pos: currentPos,
        dir: currentDir,
        status: "moving",
      });

      step += 1;
    }, 550);
  };

  const getDirRotation = (dir: Direction) => {
    if (dir === "right") return "rotate-0";
    if (dir === "down") return "rotate-90";
    if (dir === "left") return "rotate-180";
    return "-rotate-90";
  };

  return (
    <div className="flex flex-col items-center p-5 bg-white border border-neutral-200/80 rounded-3xl shadow-sm space-y-6 max-w-full overflow-hidden">
      <div className="text-center space-y-2">
        <h4 className="text-base font-bold text-neutral-900">
          {t("quests.scratch.title", "Scratch-квест: Алгоритмы")}
        </h4>
        <p className="text-sm text-neutral-600 max-w-md">{task}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] w-full max-w-2xl">
        {/* Left: Simulation Grid */}
        <div className="flex flex-col items-center justify-center bg-neutral-50/50 border border-neutral-100 rounded-2xl p-4 min-h-[260px]">
          <div className="relative border-4 border-neutral-200 rounded-xl overflow-hidden bg-neutral-100 shadow-inner">
            <div className="grid gap-1 p-2" style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 4}, minmax(0, 1fr))` }}>
              {grid.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const isRobot = robot.pos[0] === rIdx && robot.pos[1] === cIdx;
                  const isStar = targetPos[0] === rIdx && targetPos[1] === cIdx;
                  const isObstacle = cell === "X";

                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`relative flex items-center justify-center size-12 sm:size-14 rounded-lg transition-all duration-300 ${
                        isObstacle
                          ? "bg-neutral-800 border-b-4 border-neutral-950 text-white font-bold"
                          : "bg-white border border-neutral-200/60 shadow-sm"
                      }`}
                    >
                      {/* Obstacle representation */}
                      {isObstacle && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs opacity-50 select-none">
                          🧱
                        </div>
                      )}

                      {/* Target Star */}
                      {isStar && !isRobot && (
                        <div className="text-2xl animate-pulse select-none filter drop-shadow">⭐</div>
                      )}

                      {/* Robot Character */}
                      {isRobot && (
                        <div
                          className={`absolute text-2xl select-none z-10 transition-transform duration-300 ${getDirRotation(
                            robot.dir
                          )} ${
                            robot.status === "success"
                              ? "scale-110"
                              : robot.status === "crashed"
                              ? "animate-bounce grayscale"
                              : ""
                          }`}
                        >
                          {robot.status === "success" ? "🤖🎉" : robot.status === "crashed" ? "💥" : "🤖"}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Workspace & Block Palette */}
        <div className="flex flex-col min-h-[280px] space-y-4">
          {/* Palette */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-400">
              {t("quests.scratch.palette", "Доступные блоки")}
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addBlock("move")}
                disabled={robot.status !== "idle" || solved}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 transition active:scale-95 disabled:opacity-50"
              >
                ➡️ {t("quests.scratch.blockMove", "Вперед")}
              </button>
              <button
                type="button"
                onClick={() => addBlock("turn_left")}
                disabled={robot.status !== "idle" || solved}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
              >
                ↺ {t("quests.scratch.blockLeft", "Налево")}
              </button>
              <button
                type="button"
                onClick={() => addBlock("turn_right")}
                disabled={robot.status !== "idle" || solved}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
              >
                ↻ {t("quests.scratch.blockRight", "Направо")}
              </button>
            </div>
          </div>

          {/* Workspace */}
          <div className="flex-1 flex flex-col border border-neutral-200 bg-neutral-50/50 rounded-2xl p-4 min-h-[140px] overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-2">
              {t("quests.scratch.workspace", "Алгоритм действия")}
            </span>
            <div className="flex-1 flex flex-col gap-1.5 min-h-[100px] empty:border empty:border-dashed empty:border-neutral-300 empty:rounded-xl empty:flex empty:items-center empty:justify-center">
              {workspace.length === 0 ? (
                <div className="text-[11px] text-neutral-400 p-2 text-center select-none">
                  {t("quests.scratch.emptyHint", "Кликайте по блокам сверху, чтобы собрать программу.")}
                </div>
              ) : (
                workspace.map((block, idx) => {
                  const isActive = activeBlockIndex === idx;
                  const isMove = block === "move";
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm border transition-all ${
                        isMove ? "bg-violet-600 border-violet-700" : "bg-blue-600 border-blue-700"
                      } ${isActive ? "ring-2 ring-amber-400 scale-[1.02]" : ""}`}
                    >
                      <span>
                        {idx + 1}. {block === "move" ? "Шаг вперед ➡️" : block === "turn_left" ? "Повернуть налево ↺" : "Повернуть направо ↻"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBlock(idx)}
                        disabled={robot.status !== "idle" || solved}
                        className="text-white/75 hover:text-white rounded hover:bg-white/10 p-0.5"
                      >
                        <XMarkIcon className="size-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-4 py-1.5 rounded-full text-center">
          {error}
        </div>
      )}

      {/* Control panel */}
      <div className="flex items-center justify-between w-full border-t border-neutral-100 pt-4 gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetRobot}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <ArrowPathIcon className="size-3.5" />
            {t("quests.scratch.resetSimulation", "Сбросить")}
          </button>
          <button
            type="button"
            onClick={clearWorkspace}
            disabled={workspace.length === 0 || robot.status !== "idle" || solved}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:hover:text-neutral-700"
          >
            <TrashIcon className="size-3.5" />
            {t("quests.scratch.clearWorkspace", "Очистить")}
          </button>
        </div>

        <button
          type="button"
          onClick={runSimulation}
          disabled={solved || robot.status === "moving"}
          className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold text-white transition-colors ${
            solved
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-neutral-900 hover:bg-neutral-800"
          }`}
        >
          {solved ? (
            <>
              <CheckIcon className="size-3.5 stroke-[2.5]" />
              {t("common.solved", "Пройдено!")}
            </>
          ) : (
            <>
              <PlayIcon className="size-3.5 stroke-[2.5]" />
              {t("quests.scratch.run", "Запустить программу")}
            </>
          )}
        </button>
      </div>

      {showHint && hint && (
        <div className="w-full bg-amber-50/50 border border-amber-100/70 rounded-2xl p-4 text-xs leading-relaxed text-amber-900">
          <strong>{t("common.hint", "Подсказка")}:</strong> {hint}
        </div>
      )}
      {hint && !showHint && (
        <button
          type="button"
          onClick={() => setShowHint(true)}
          className="text-xs font-medium text-[#6084ff] hover:underline"
        >
          {t("common.showHint", "Показать подсказку")}
        </button>
      )}
    </div>
  );
}
