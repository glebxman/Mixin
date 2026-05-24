import { Avatar, Card } from "@edtech/ui";
import type { ParentChild } from "@edtech/api-client";

export function ChildSelector({
  children: items,
  selectedId,
  onSelect,
}: {
  children: ParentChild[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length <= 1) return null;

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-medium text-neutral-700">Выберите ребёнка</p>
      <div className="flex flex-wrap gap-2">
        {items.map((child) => {
          const fullName = `${child.firstName} ${child.lastName}`.trim();
          const active = selectedId === child.id;
          return (
            <button
              key={child.id}
              onClick={() => onSelect(child.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                active
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <Avatar name={fullName} size="sm" />
              <div>
                <p className="font-medium text-neutral-900">{fullName}</p>
                <p className="text-xs text-neutral-500">
                  {child.grade}, {child.schoolName ?? "Школа не указана"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
