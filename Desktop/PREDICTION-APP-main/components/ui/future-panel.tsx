import * as React from "react";

import { cn } from "@/lib/utils";

type FuturePanelProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  value?: React.ReactNode;
  description?: string;
};

export function FuturePanel({
  title,
  value,
  description,
  children,
  className,
  ...props
}: FuturePanelProps) {
  return (
    <div
      {...props}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-blue-400/20 bg-[#06101d]/60 p-5 backdrop-blur-xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

      {title && (
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-blue-400">
          {title}
        </p>
      )}

      {value && (
        <div className="mt-4 text-3xl font-light tracking-tight text-white">
          {value}
        </div>
      )}

      {description && (
        <p className="mt-2 text-xs leading-5 text-zinc-600">
          {description}
        </p>
      )}

      {children}
    </div>
  );
}
