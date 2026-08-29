import * as React from "react";

import { cn } from "@/lib/utils";

type FutureSignalProps = {
  strength?: number;
  className?: string;
};

export function FutureSignal({
  strength = 99,
  className,
}: FutureSignalProps) {
  const bars = [
    20, 35, 55, 80, 45, 70, 100, 60, 90, 50, 75, 35, 65, 95, 55, 30, 70,
    45, 85, 40,
  ];

  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-14 items-center justify-center gap-[3px] overflow-hidden">

        {bars.map((height, index) => (
          <span
            key={index}
            className="w-[3px] rounded-full bg-gradient-to-t from-blue-600 via-cyan-400 to-purple-400 opacity-80"
            style={{
              height: `${height}%`,
              animation: `futureSignal ${0.7 + (index % 5) * 0.15}s ease-in-out infinite alternate`,
              animationDelay: `${index * 0.04}s`,
            }}
          />
        ))}

      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-600">
          Signal strength
        </span>

        <span className="font-mono text-xs text-cyan-300">
          {strength}%
        </span>
      </div>

      <div className="mt-2 h-[2px] overflow-hidden rounded-full bg-white/[0.05]">

        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-purple-500 shadow-[0_0_10px_#22d3ee]"
          style={{
            width: `${Math.min(100, Math.max(0, strength))}%`,
          }}
        />

      </div>

      <style>{`
        @keyframes futureSignal {
          from {
            transform: scaleY(0.4);
            opacity: 0.35;
          }

          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
