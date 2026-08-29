import * as React from "react";

import { cn } from "@/lib/utils";

type TemporalRingProps = {
  children?: React.ReactNode;
  className?: string;
  size?: number;
};

export function TemporalRing({
  children,
  className,
  size = 420,
}: TemporalRingProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        className,
      )}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Glow */}

      <div className="absolute inset-[10%] rounded-full bg-blue-500/10 blur-[60px]" />

      {/* Anillo externo */}

      <div
        className="absolute inset-0 rounded-full border border-cyan-400/15"
        style={{
          animation: "temporalRotate 25s linear infinite",
        }}
      >
        <span className="absolute left-1/2 top-[-3px] size-1.5 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]" />

        <span className="absolute bottom-[20%] right-[4%] size-1 rounded-full bg-purple-400 shadow-[0_0_10px_#c084fc]" />
      </div>

      {/* Anillo medio */}

      <div
        className="absolute inset-[9%] rounded-full border border-dashed border-purple-400/25"
        style={{
          animation: "temporalReverse 18s linear infinite",
        }}
      />

      {/* Anillo interior */}

      <div className="absolute inset-[18%] rounded-full border border-blue-400/25 shadow-[0_0_60px_rgba(59,130,246,0.16)]" />

      {/* Orbita */}

      <div
        className="absolute inset-[27%] rounded-full border border-cyan-300/30"
        style={{
          animation: "temporalPulse 3s ease-in-out infinite",
        }}
      />

      {/* Contenido */}

      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>

      <style>{`
        @keyframes temporalRotate {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes temporalReverse {
          to {
            transform: rotate(-360deg);
          }
        }

        @keyframes temporalPulse {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0.5;
          }

          50% {
            transform: scale(1.04);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
