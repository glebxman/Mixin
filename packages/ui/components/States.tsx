import * as React from "react";
import {
  ExclamationTriangleIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import { Spinner } from "./Spinner";
import { cn } from "../lib/utils";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface BaseProps {
  className?: string;
}

export function LoadingState({
  label = "Загрузка...",
  className,
}: BaseProps & { label?: string }) {
  return (
    <div
      className={cn(
        "animate-fade-in flex items-center justify-center rounded-2xl border border-neutral-200 bg-white p-12 text-neutral-500",
        className,
      )}
    >
      <Spinner className="text-neutral-700" />
      <span className="ml-3 text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({
  title = "Что-то пошло не так",
  message,
  className,
  action,
}: BaseProps & {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "animate-fade-in-up flex flex-col items-center gap-3 rounded-2xl border border-[#e92554]/25 bg-[#e92554]/10 p-8 text-center text-[#e92554]",
        className,
      )}
    >
      <ExclamationTriangleIcon className="size-7" />
      <p className="font-semibold">{title}</p>
      {message && <p className="text-sm text-[#e92554]/80">{message}</p>}
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
  action,
  className,
}: BaseProps & {
  title: string;
  description?: string;
  icon?: IconType;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "animate-fade-in-up flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-12 text-center",
        className,
      )}
    >
      <div className="animate-scale-in mb-4 grid size-12 place-items-center rounded-full bg-neutral-100 text-neutral-500">
        <Icon className="size-6" />
      </div>
      <p className="text-base font-semibold text-neutral-900">{title}</p>
      {description && (
        <p className="mt-2 max-w-md text-sm text-neutral-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * SkeletonBlock — для placeholder loading состояний (списков, таблиц).
 * Подсвечивается shimmer-анимацией из styles.css.
 */
export function SkeletonBlock({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton h-4", className)} {...rest} />;
}
