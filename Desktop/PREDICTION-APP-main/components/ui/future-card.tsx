import * as React from "react";

import { cn } from "@/lib/utils";

type FutureCardProps = React.HTMLAttributes<HTMLDivElement> & {
  glow?: "cyan" | "purple" | "blue";
};

export function FutureCard({
  children,
  className,
  glow = "cyan",
  ...props
}: FutureCardProps) {
  const glows = {
    cyan: "hover:border-cyan-400/40 hover:shadow-[0_0_45px_rgba(34,211,238,0.12)]",
    purple:
      "hover:border-purple-400/40 hover:shadow-[0_0_45px_rgba(168,85,247,0.12)]",
    blue: "hover:border-blue-400/40 hover:shadow-[0_0_45px_rgba(59,130,246,0.12)]",
  };

  return (
    <div
      {...props}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07101b]/65 backdrop-blur-2xl transition-all duration-300",
        glows[glow],
        className,
      )}
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

      <div className="pointer-events-none absolute -right-20 -top-20 size-40 rounded-full bg-cyan-400/[0.04] blur-3xl transition-all duration-500 group-hover:bg-cyan-400/[0.08]" />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
