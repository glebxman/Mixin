import * as React from "react";
import { cn } from "../lib/utils";

const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "min-h-0 overflow-y-auto overscroll-contain [scrollbar-color:#d7d7d7_transparent] [scrollbar-width:thin]",
        className,
      )}
      {...props}
    />
  ),
);
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
