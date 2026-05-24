import { Section, cn } from "@edtech/ui";
import { CheckIcon } from "@heroicons/react/24/outline";

export function ChipsSection({
  title,
  description,
  options,
  selected,
  onChange,
  renderOption,
}: {
  title: string;
  description?: string;
  options: string[];
  selected: string[];
  onChange: (value: string) => void;
  renderOption?: (value: string) => React.ReactNode;
}) {
  return (
    <Section title={title} description={description}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
              )}
            >
              {active && <CheckIcon className="size-3.5" />}
              {renderOption ? renderOption(option) : option}
            </button>
          );
        })}
      </div>
    </Section>
  );
}
