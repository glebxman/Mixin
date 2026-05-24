import * as React from "react";
import { UserIcon } from "@heroicons/react/24/outline";
import { cn } from "../lib/utils";

interface AvatarProps {
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-11 text-base",
} as const;

const colorPalette = [
  "bg-emerald-500",
  "bg-[#6084ff]",
  "bg-violet-500",
  "bg-[#e92554]",
  "bg-amber-500",
  "bg-cyan-500",
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
  return colorPalette[Math.abs(hash) % colorPalette.length];
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        sizeMap[size],
        name ? colorFor(name) : "bg-neutral-300",
        className,
      )}
    >
      {initials || <UserIcon className="size-1/2" />}
    </div>
  );
}
