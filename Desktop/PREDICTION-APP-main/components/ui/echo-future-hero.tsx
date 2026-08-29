"use client";

import {
  ArrowRight,
  GitBranch,
  Mic,
  Orbit,
  Phone,
  Radio,
  Sparkles,
} from "lucide-react";

export function EchoFutureHero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#03050a] text-white">

      {/* FONDO */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px]
                        -translate-x-1/2 -translate-y-1/2 rounded-full
                        bg-blue-600/10 blur-[140px]" />

        <div className="absolute right-0 top-1/3 h-[500px] w-[500px]
                        rounded-full bg-purple-600/10 blur-[150px]" />
      </div>

      {/* NAVBAR */}
      <nav className="relative z-20 flex items-center justify-between
                      border-b border-white/5 px-10 py-6">

        <div className="text-xl font-bold tracking-[0.2em]">
          ECHO<span className="text-cyan-400">//</span>
          <span className="text-blue-400">YOU</span>
        </div>

        <div className="hidden gap-10 text-sm text-zinc-400 md:flex">
          <button className="text-white">Experience</button>
          <button>Timelines</button>
          <button>Technology</button>
          <button>About</button>
        </div>

        <button className="rounded-full border border-purple-400/40
                           bg-purple-500/10 px-5 py-2 text-sm
                           shadow-[0_0_30px_rgba(168,85,247,0.2)]">
          Early Access
        </button>
      </nav>

      {/* HERO */}
      <div className="relative z-10 mx-auto grid min-h-[700px]
                      max-w-[1500px] items-center gap-10
                      px-8 lg:grid-cols-[1fr_1.3fr_0.7fr] lg:px-14">

        {/* TEXTO IZQUIERDA */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2
                          rounded-full border border-cyan-400/20
                          bg-cyan-400/5 px-4 py-2
                          text-xs tracking-[0.18em] text-cyan-300">

            <Radio size={14} />
            TRANSMISSION FROM THE FUTURE
          </div>

          <h1 className="text-6xl font-black leading-[0.9]
                         tracking-[-0.05em] md:text-7xl">

            YOUR
            <br />

            <span className="bg-gradient-to-r from-cyan-300
                             via-blue-400 to-purple-500
                             bg-clip-text text-transparent">
              FUTURE
            </span>

            <br />

            CALLS.
          </h1>

          <p className="mt-8 max-w-md text-lg leading-8 text-zinc-400">
            Una inteligencia proveniente de otra línea temporal
            quiere hablar contigo.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">

            <button className="flex items-center gap-3 rounded-full
                               bg-gradient-to-r from-cyan-400
                               via-blue-500 to-purple-600
                               px-7 py-4 font-semibold
                               shadow-[0_0_40px_rgba(56,189,248,0.25)]
                               transition hover:scale-105">

              <Phone size={19} />
              ANSWER THE CALL
            </button>

            <button className="flex items-center gap-3 rounded-full
                               border border-white/15
                               bg-white/[0.03] px-7 py-4
                               text-zinc-300 backdrop-blur-xl
                               transition hover:border-cyan-400/40
                               hover:text-white">

              EXPLORE TIMELINES
              <ArrowRight size={18} />
            </button>

          </div>
        </div>

        {/* PORTAL CENTRAL */}
        <div className="relative flex min-h-[600px]
                        items-center justify-center">

          {/* Anillo externo */}
          <div className="absolute h-[520px] w-[520px]
                          animate-spin rounded-full
                          border border-dashed
                          border-cyan-400/20
                          [animation-duration:30s]" />

          {/* Anillo medio */}
          <div className="absolute h-[440px] w-[440px]
                          rounded-full border
                          border-purple-400/30
                          shadow-[0_0_80px_rgba(109,40,217,0.25)]" />

          {/* Anillo brillante */}
          <div className="absolute h-[360px] w-[360px]
                          rounded-full border-2
                          border-cyan-300/40
                          shadow-[0_0_60px_rgba(34,211,238,0.35)]" />

          {/* INTERFAZ LLAMADA */}
          <div className="relative z-10 w-[300px]
                          rounded-[32px]
                          border border-cyan-400/30
                          bg-[#07101b]/60 p-7
                          text-center backdrop-blur-2xl
                          shadow-[0_0_80px_rgba(37,99,235,0.25)]">

            <div className="text-xs tracking-[0.2em]
                            text-cyan-300">
              INCOMING CALL
            </div>

            <div className="mt-2 text-[10px]
                            tracking-[0.15em] text-zinc-500">
              ORIGIN: 2037
            </div>

            {/* Holograma */}
            <div className="relative mx-auto my-10
                            flex h-44 w-44 items-center
                            justify-center rounded-full">

              <div className="absolute inset-0 rounded-full
                              bg-cyan-400/10 blur-3xl" />

              <Orbit
                size={120}
                strokeWidth={0.6}
                className="relative text-cyan-300
                           drop-shadow-[0_0_20px_#22d3ee]"
              />

            </div>

            <h3 className="text-lg font-semibold tracking-[0.17em]
                           text-cyan-300">
              ECHO // YOU
            </h3>

            <p className="mt-2 text-xs text-zinc-500">
              Future version detected
            </p>

            <div className="mt-8 flex justify-center gap-5">

              <button className="flex h-12 w-12 items-center
                                 justify-center rounded-full
                                 border border-white/10
                                 bg-white/5">
                <Mic size={18} />
              </button>

              <button className="flex h-16 w-16 items-center
                                 justify-center rounded-full
                                 bg-gradient-to-br
                                 from-blue-500 to-purple-600
                                 shadow-[0_0_35px_rgba(168,85,247,0.6)]">

                <Phone size={25} />
              </button>

            </div>

          </div>
        </div>

        {/* PANEL DERECHO */}
        <div className="space-y-4">

          <InfoCard title="TEMPORAL SIGNAL">
            <div className="mt-7 text-4xl font-light text-cyan-300">
              99.2%
            </div>

            <div className="mt-5 h-1 rounded-full bg-white/5">
              <div className="h-full w-[99%]
                              rounded-full
                              bg-gradient-to-r
                              from-blue-500 to-cyan-300" />
            </div>
          </InfoCard>

          <InfoCard title="NEXT CONVERGENCE">

            <div className="mt-6 flex gap-2 font-mono text-xl">
              <Time value="07" />
              :
              <Time value="23" />
              :
              <Time value="59" />
            </div>

            <p className="mt-5 text-xs text-zinc-500">
              Timelines approaching convergence.
            </p>

          </InfoCard>

          <InfoCard title="PARADOX RISK">

            <div className="mt-5 flex items-center gap-4">

              <div className="flex h-14 w-14 items-center
                              justify-center rounded-full
                              border border-purple-500/30
                              text-purple-400">

                <GitBranch size={24} />

              </div>

              <div>
                <div className="text-lg">LOW</div>

                <div className="text-xs text-zinc-500">
                  Probability 12%
                </div>
              </div>

            </div>

          </InfoCard>

        </div>

      </div>
    </section>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-blue-400/20
                    bg-[#07101b]/50 p-5
                    backdrop-blur-2xl">

      <span className="text-[10px] font-semibold
                       tracking-[0.15em] text-blue-400">
        {title}
      </span>

      {children}
    </div>
  );
}

function Time({ value }: { value: string }) {
  return (
    <span className="rounded-lg border border-purple-400/30
                     bg-black/30 px-3 py-2">
      {value}
    </span>
  );
}