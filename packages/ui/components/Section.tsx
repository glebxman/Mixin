import * as React from "react";
import { cn } from "../lib/utils";

interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Section — лёгкая обёртка над `<section>` для группировок внутри страницы.
 * Используется в настройках, профиле, формах.
 */
export function Section({
  title,
  description,
  actions,
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-white/80 bg-white p-6 ",
        className,
      )}
      {...rest}
    >
      {(title || actions) && (
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-neutral-500">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
