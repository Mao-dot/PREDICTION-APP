"use client";

export function FuturePortalBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#040404]"
      aria-hidden="true"
    >
      {/* BASE OSCURA */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#070707_0%,#040404_45%,#000000_100%)]" />

      {/* GLOW SUPERIOR ROJO MUY SUTIL */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,0,30,0.06),transparent_22%)] animate-[pulse_8s_ease-in-out_infinite]" />

      {/* NIEBLA DE FONDO */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.035),transparent_28%),radial-gradient(circle_at_50%_48%,rgba(180,180,180,0.03),transparent_36%),radial-gradient(circle_at_50%_70%,rgba(80,80,80,0.025),transparent_42%)]" />

      {/* PORTAL CENTRAL */}
      <div className="absolute left-1/2 top-[-120px] h-[1200px] w-[1200px] -translate-x-1/2">
        {/* CAPA 1 */}
        <div
          className="
            absolute inset-[2%]
            rounded-full
            border border-zinc-400/[0.12]
            bg-[radial-gradient(circle,rgba(255,255,255,0.03),rgba(90,90,90,0.025)_35%,transparent_72%)]
            animate-[spin_42s_linear_infinite]
          "
          style={{
            borderRadius: "48% 52% 60% 40% / 55% 45% 58% 42%",
          }}
        />

        {/* CAPA 2 */}
        <div
          className="
            absolute inset-[10%]
            rounded-full
            border border-zinc-500/[0.10]
            bg-[radial-gradient(circle,rgba(255,255,255,0.02),rgba(60,60,60,0.03)_40%,transparent_74%)]
            animate-[spin_30s_linear_infinite_reverse]
          "
          style={{
            borderRadius: "56% 44% 46% 54% / 44% 57% 43% 56%",
          }}
        />

        {/* CAPA 3 */}
        <div
          className="
            absolute inset-[18%]
            rounded-full
            border border-zinc-300/[0.10]
            bg-[radial-gradient(circle,rgba(255,255,255,0.02),rgba(100,100,100,0.025)_42%,transparent_75%)]
            animate-[spin_24s_linear_infinite]
          "
          style={{
            borderRadius: "43% 57% 55% 45% / 59% 42% 58% 41%",
          }}
        />

        {/* CAPA 4 */}
        <div
          className="
            absolute inset-[26%]
            rounded-full
            border border-zinc-400/[0.08]
            bg-[radial-gradient(circle,rgba(255,255,255,0.015),rgba(70,70,70,0.02)_42%,transparent_78%)]
            animate-[spin_18s_linear_infinite_reverse]
          "
          style={{
            borderRadius: "57% 43% 40% 60% / 45% 58% 42% 55%",
          }}
        />

        {/* ANILLOS TEMPORALES */}
        <div className="absolute inset-[8%] rounded-full border border-zinc-300/[0.09] animate-[pulse_9s_ease-in-out_infinite]" />
        <div className="absolute inset-[20%] rounded-full border border-zinc-400/[0.08] animate-[pulse_7s_ease-in-out_infinite]" />
        <div className="absolute inset-[33%] rounded-full border border-zinc-500/[0.07] animate-[pulse_6s_ease-in-out_infinite]" />

        {/* NIEBLA GIRATORIA */}
        <div
          className="
            absolute inset-[14%]
            rounded-full
            blur-[44px]
            opacity-70
            animate-[spin_55s_linear_infinite]
            bg-[conic-gradient(from_0deg,rgba(255,255,255,0.035),rgba(20,20,20,0.03),rgba(160,160,160,0.03),rgba(0,0,0,0.035),rgba(255,255,255,0.03))]
          "
        />

        {/* HALO SUAVE */}
        <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.045),rgba(100,100,100,0.02)_35%,transparent_72%)] blur-[28px] animate-[pulse_10s_ease-in-out_infinite]" />

        {/* NÚCLEO OSCURO */}
        <div className="absolute inset-[34%] rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.55),rgba(0,0,0,0.35)_48%,transparent_82%)] blur-[18px]" />

        {/* ROJO 1% */}
        <div className="absolute inset-[36%] rounded-full bg-[radial-gradient(circle,rgba(255,0,25,0.02),rgba(255,0,25,0.008)_28%,transparent_70%)] blur-[60px] animate-[pulse_8s_ease-in-out_infinite]" />
      </div>

      {/* OVERLAY DE VIAJE TEMPORAL */}
      <div className="absolute inset-0 opacity-55 mix-blend-screen animate-[temporalShift_16s_ease-in-out_infinite] bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.045),transparent_18%),radial-gradient(circle_at_47%_48%,rgba(255,255,255,0.02),transparent_28%),radial-gradient(circle_at_53%_52%,rgba(255,0,20,0.015),transparent_16%)]" />

      {/* VIÑETA */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.14)_50%,rgba(0,0,0,0.85)_100%)]" />

      <style>{`
        @keyframes temporalShift {
          0%, 100% {
            transform: scale(1) translateY(0px);
            opacity: 0.28;
          }
          25% {
            transform: scale(1.02) translateY(-8px);
            opacity: 0.40;
          }
          50% {
            transform: scale(1.05) translateY(6px);
            opacity: 0.52;
          }
          75% {
            transform: scale(1.015) translateY(-4px);
            opacity: 0.36;
          }
        }

        @media (max-width: 900px) {
          .absolute.left-1\\/2.top-\\[-120px\\].h-\\[1200px\\].w-\\[1200px\\].-translate-x-1\\/2 {
            width: 980px;
            height: 980px;
            top: -40px;
          }
        }

        @media (max-width: 640px) {
          .absolute.left-1\\/2.top-\\[-120px\\].h-\\[1200px\\].w-\\[1200px\\].-translate-x-1\\/2 {
            width: 860px;
            height: 860px;
            top: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
