import * as React from "react";

import { cn } from "@/lib/utils";

type FutureBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  status?: "live" | "stable" | "future" | "warning";
};

export function FutureBadge({
  children,
  className,
  status = "future",
  ...props
}: FutureBadgeProps) {
  const styles = {
    live: "border-fuchsia-400/20 bg-fuchsia-400/[0.07] text-fuchsia-300",
    stable: "border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300",
    future:
      "border-purple-400/20 bg-purple-400/[0.07] text-purple-300",
    warning:
      "border-amber-400/20 bg-amber-400/[0.07] text-amber-300",
  };

  const dots = {
    live: "bg-fuchsia-400 shadow-[0_0_8px_#e879f9]",
    stable: "bg-cyan-400 shadow-[0_0_8px_#22d3ee]",
    future: "bg-purple-400 shadow-[0_0_8px_#c084fc]",
    warning: "bg-amber-400 shadow-[0_0_8px_#fbbf24]",
  };

  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em]",
        styles[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dots[status])} />

      {children}
    </span>
  );
}
