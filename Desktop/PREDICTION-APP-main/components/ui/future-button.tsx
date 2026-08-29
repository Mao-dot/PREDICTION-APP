import * as React from "react";

import { cn } from "@/lib/utils";

type FutureButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger";
  };

export function FutureButton({
  children,
  className,
  variant = "primary",
  ...props
}: FutureButtonProps) {
  const variants = {
    primary:
      "border-red-500/30 bg-gradient-to-r from-red-800 via-red-700 to-red-600 text-white shadow-[0_0_30px_rgba(239,68,68,0.20)] hover:shadow-[0_0_45px_rgba(239,68,68,0.35)]",

    secondary:
      "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-red-500/40 hover:bg-red-500/[0.05] hover:text-red-200",

    danger:
      "border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  };

  return (
    <button
      {...props}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md border px-6 py-3 font-mono text-xs uppercase tracking-[0.14em] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
