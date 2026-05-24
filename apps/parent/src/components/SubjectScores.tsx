import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ProgressBar,
  progressVariantForScore,
} from "@edtech/ui";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BookOpenIcon,
  MinusSmallIcon,
} from "@heroicons/react/24/outline";
import type { SubjectScore } from "@edtech/api-client";

export function SubjectScores({ items }: { items: SubjectScore[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpenIcon className="size-5 text-emerald-500" />
          Успеваемость по предметам
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="Данные появятся после первых занятий"
            description="Как только ребёнок начнёт заниматься, мы покажем оценки."
            icon={BookOpenIcon}
          />
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.subject} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-900">{item.subject}</p>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={item.trend} />
                    <span className="min-w-[3ch] text-right text-sm font-bold text-neutral-900">
                      {Math.round(item.score)}%
                    </span>
                  </div>
                </div>
                <ProgressBar
                  value={item.score}
                  variant={progressVariantForScore(item.score)}
                  size="md"
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <ArrowTrendingUpIcon className="size-4 text-emerald-600" />;
  if (trend === "down") return <ArrowTrendingDownIcon className="size-4 text-rose-600" />;
  return <MinusSmallIcon className="size-4 text-neutral-400" />;
}
