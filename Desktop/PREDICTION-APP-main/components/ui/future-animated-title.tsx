"use client";

export function FutureAnimatedTitle() {
  return (
    <div className="future-title-container">
      {/* TEXTO SUPERIOR */}
      <div className="future-kicker">
        <span className="future-dot" />
        <span>ENTRANTE</span>
        <span className="future-slashes">//</span>
        <span>2098</span>
      </div>

      {/* TÍTULO EXACTO */}
      <h1 className="future-main-title">
        <span className="future-title-line future-red future-delay-1">
          TELÉFONO
        </span>

        <span className="future-title-line future-white future-delay-2">
          NEGRO DEL
        </span>

        <span className="future-title-line future-white future-delay-3">
          FUTURO
        </span>
      </h1>

      <style>{`
        .future-title-container {
          position: relative;
          width: 100%;
          text-align: center;
          overflow: visible;
        }

        /* =========================
           TEXTO PEQUEÑO
        ========================= */

        .future-kicker {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;

          margin-bottom: 12px;

          font-family: monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.35em;

          color: #ff2634;

          opacity: 0;

          animation:
            futureKickerEnter
            0.8s
            ease-out
            forwards;
        }

        .future-dot {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #ff1a27;

          box-shadow:
            0 0 8px #ff1a27,
            0 0 18px rgba(255, 26, 39, 0.7);

          animation:
            futureDotPulse
            1.3s
            ease-in-out
            infinite;
        }

        .future-slashes {
          color: #e60012;

          animation:
            futureSlashPulse
            1.3s
            ease-in-out
            infinite;
        }

        /* =========================
           TÍTULO
        ========================= */

        .future-main-title {
          margin: 0;

          display: flex;
          flex-direction: column;
          align-items: center;

          font-family:
            "Arial Black",
            Arial,
            Helvetica,
            sans-serif;

          font-size:
            clamp(3rem, 8vw, 6.7rem);

          font-weight: 900;

          line-height: 0.82;

          letter-spacing: -0.055em;

          text-transform: uppercase;
        }

        .future-title-line {
          display: block;

          width: max-content;
          max-width: 100%;

          white-space: nowrap;

          opacity: 0;

          transform:
            translateY(38px)
            scale(0.94);

          filter: blur(14px);

          will-change:
            opacity,
            transform,
            filter;

          animation:
            futureTitleReveal
            1s
            cubic-bezier(0.16, 1, 0.3, 1)
            forwards;
        }

        /* =========================
           ROJO DE TELÉFONO
        ========================= */

        .future-red {
          color: transparent;

          background:
            linear-gradient(
              180deg,
              #ff4752 0%,
              #ff101e 35%,
              #ed0010 65%,
              #bc0009 100%
            );

          background-size: 100% 200%;

          -webkit-background-clip: text;
          background-clip: text;

          animation:
            futureTitleReveal
            1s
            cubic-bezier(0.16, 1, 0.3, 1)
            forwards,
            futureRedSweep
            2.4s
            ease-out
            forwards;

          filter:
            drop-shadow(
              0 0 14px
              rgba(255, 0, 20, 0.08)
            );
        }

        /* =========================
           BLANCO / PLATA
        ========================= */

        .future-white {
          color: transparent;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ffffff 53%,
              #efefef 70%,
              #b5b5b5 115%
            );

          -webkit-background-clip: text;
          background-clip: text;
        }

        /* =========================
           RETRASOS
        ========================= */

        .future-delay-1 {
          animation-delay:
            0.15s,
            0.15s;
        }

        .future-delay-2 {
          animation-delay:
            0.48s;
        }

        .future-delay-3 {
          animation-delay:
            0.78s;
        }

        /* =========================
           ENTRADA
        ========================= */

        @keyframes futureTitleReveal {
          0% {
            opacity: 0;

            transform:
              translateY(38px)
              scale(0.94);

            filter: blur(14px);
          }

          45% {
            opacity: 1;

            filter: blur(3px);
          }

          72% {
            transform:
              translateY(-3px)
              scale(1.012);
          }

          100% {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);

            filter: blur(0);
          }
        }

        @keyframes futureRedSweep {
          from {
            background-position:
              0% 100%;
          }

          to {
            background-position:
              0% 0%;
          }
        }

        /* =========================
           DETALLES FUTURISTAS
        ========================= */

        @keyframes futureKickerEnter {
          from {
            opacity: 0;

            transform:
              translateY(-10px);

            filter: blur(7px);

            letter-spacing: 0.5em;
          }

          to {
            opacity: 1;

            transform:
              translateY(0);

            filter: blur(0);

            letter-spacing: 0.35em;
          }
        }

        @keyframes futureDotPulse {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(0.8);
          }

          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }

        @keyframes futureSlashPulse {
          0%,
          100% {
            opacity: 0.35;
          }

          50% {
            opacity: 1;

            text-shadow:
              0 0 12px
              rgba(255, 0, 20, 0.9);
          }
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (max-width: 600px) {
          .future-main-title {
            font-size:
              clamp(2.8rem, 14vw, 4.5rem);

            line-height: 0.85;
          }

          .future-kicker {
            font-size: 8px;
            letter-spacing: 0.25em;
          }
        }

        /* =========================
           ACCESIBILIDAD
        ========================= */

        @media (prefers-reduced-motion: reduce) {
          .future-title-line,
          .future-kicker {
            opacity: 1;
            transform: none;
            filter: none;
            animation: none;
          }

          .future-dot,
          .future-slashes {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}