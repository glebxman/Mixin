import * as React from "react";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { cn } from "../lib/utils";
import { Avatar } from "./Avatar";

type NavItem = {
  to: string;
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  active?: boolean;
};

interface TopNavProps {
  brand: React.ReactNode;
  panelLabel?: string;
  items?: NavItem[];
  user?: { name: string; sub?: string };
  onLogout?: () => void;
  /** Принимает любой роутерный Link, чтобы не зависеть от react-router. */
  LinkComponent?: React.ComponentType<{
    to: string;
    className?: string;
    children: React.ReactNode;
  }>;
  className?: string;
}

const Anchor = ({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <a href={to} className={className}>
    {children}
  </a>
);

export function TopNav({
  brand,
  panelLabel,
  items = [],
  user,
  onLogout,
  LinkComponent = Anchor,
  className,
}: TopNavProps) {
  const Link = LinkComponent;
  return (
    <nav
      className={cn(
        "sticky top-0 z-30 rounded-[30px] border border-white/70 bg-[#ffffff]/95 px-4 py-3  backdrop-blur-xl sm:px-6",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 rounded-full transition-transform duration-200 hover:-translate-y-px"
        >
          {brand}
        </Link>

        {items.length > 0 && (
          <div className="hidden items-center gap-1 md:flex">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                    item.active
                      ? "bg-neutral-950 text-white"
                      : "text-neutral-600 hover:bg-white hover:text-neutral-900",
                  )}
                >
                  {Icon && <Icon className="size-4" />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          {panelLabel && (
            <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-700 sm:inline">
              {panelLabel}
            </span>
          )}
          {user && (
            <div className="flex items-center gap-2">
              <Avatar name={user.name} size="sm" />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight text-neutral-900">
                  {user.name}
                </p>
                {user.sub && (
                  <p className="text-xs leading-tight text-neutral-500">{user.sub}</p>
                )}
              </div>
            </div>
          )}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-950 hover:text-white"
            >
              <ArrowRightOnRectangleIcon className="size-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
