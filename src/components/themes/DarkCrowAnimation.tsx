import { useEffect, useRef, useState } from "react";

/**
 * Overlay animato del tema "Dark Crow" (PROTOTIPO).
 * Atmosfera (luna, nebbia, lampi) + un corvo stilizzato che scende dall'alto,
 * si posa sopra i pulsanti e poi svolazza via.
 *
 * API:
 *  - active: quando true accende l'atmosfera (nebbia/luna pulsante). Tipicamente
 *            legato all'hover sulla card.
 *  - playToken: ogni volta che cambia (incrementa) avvia la sequenza del corvo.
 *            La logica di cooldown (es. 20s) sta nel componente padre.
 *  - perchMs: quanti ms il corvo resta posato (default 5000).
 */

type Phase = "idle" | "incoming" | "perched" | "leaving";

interface DarkCrowAnimationProps {
  active?: boolean;
  playToken: number;
  perchMs?: number;
}

const INCOMING_MS = 1700;
const LEAVING_MS = 1400;

// Foto reali del corvo (PNG trasparenti): una in VOLO (arrivo/partenza) e una
// POSATA (mentre sta sulla card). Se mancano o non caricano, si usa il corvo
// SVG come fallback (così il prototipo non si rompe mai).
const CROW_FLY_SRC = "/themes/dark-crow/crow-fly.png";
const CROW_PERCH_SRC = "/themes/dark-crow/crow-perched.png";

export const DarkCrowAnimation = ({ active = false, playToken, perchMs = 5000 }: DarkCrowAnimationProps) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [strikeKey, setStrikeKey] = useState(0);
  const [usePhoto, setUsePhoto] = useState(true); // false se l'immagine non c'è
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!playToken) return; // 0 = mai avviato

    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];

    setPhase("incoming");
    setStrikeKey((k) => k + 1); // lampo all'arrivo

    timers.current.push(window.setTimeout(() => setPhase("perched"), INCOMING_MS));
    timers.current.push(window.setTimeout(() => setStrikeKey((k) => k + 1), INCOMING_MS + 1300)); // lampo da posato
    timers.current.push(window.setTimeout(() => setPhase("leaving"), INCOMING_MS + perchMs));
    timers.current.push(window.setTimeout(() => setPhase("idle"), INCOMING_MS + perchMs + LEAVING_MS));

    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };
  }, [playToken, perchMs]);

  const flapping = phase === "incoming" || phase === "leaving";
  const showFlying = phase === "incoming" || phase === "leaving";
  const showPerched = phase === "perched";

  return (
    <div className={`dc-overlay ${active ? "dc-active" : ""}`}>
      <div className="dc-atmosphere">
        <div className="dc-moon" />
        <div className="dc-fog dc-fog-mid" />
        <div className="dc-fog dc-fog-bottom" />
        <div key={strikeKey} className={`dc-lightning ${strikeKey ? "dc-strike" : ""}`} />
      </div>

      {phase !== "idle" && (
        <div className={`dc-crow dc-${phase} ${usePhoto ? "dc-crow-photo" : flapping ? "dc-flapping" : ""}`}>
          {usePhoto ? (
            <>
              {/* Posa in VOLO (arrivo e partenza) */}
              <img
                className="dc-crow-img dc-crow-fly"
                src={CROW_FLY_SRC}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{ opacity: showPerched ? 0 : 1 }}
                onError={() => setUsePhoto(false)}
              />
              {/* Posa POSATA (mentre sta sulla card) */}
              <img
                className="dc-crow-img dc-crow-perch"
                src={CROW_PERCH_SRC}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{ opacity: showPerched ? 1 : 0 }}
                onError={() => setUsePhoto(false)}
              />
            </>
          ) : (
          <svg viewBox="0 0 120 80" width={120} height={80} aria-hidden="true">
            <defs>
              <filter id="dc-eye-glow" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="1.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ---- POSA IN VOLO (simmetrica, ali che battono) ---- */}
            <g
              className="dc-pose-flying"
              style={{ opacity: showFlying ? 1 : 0 }}
              fill="#0a0a12"
              stroke="rgba(150,130,220,0.30)"
              strokeWidth={0.6}
            >
              {/* coda */}
              <path d="M60 56 L53 73 L60 66 L67 73 Z" />
              {/* corpo */}
              <ellipse cx="60" cy="44" rx="6" ry="15" />
              {/* testa */}
              <circle cx="60" cy="27" r="5.2" />
              {/* becco (verso l'alto) */}
              <path d="M57 16 L63 16 L60 9 Z" />
              {/* ala sinistra */}
              <path className="dc-wing dc-wing-l" d="M56 38 C42 26 24 24 8 32 C24 34 42 40 56 46 Z" />
              {/* ala destra */}
              <path className="dc-wing dc-wing-r" d="M64 38 C78 26 96 24 112 32 C96 34 78 40 64 46 Z" />
            </g>

            {/* ---- POSA POSATO (di profilo, verso destra) ---- */}
            <g
              className="dc-pose-perched"
              style={{ opacity: showPerched ? 1 : 0 }}
              fill="#0a0a12"
              stroke="rgba(150,130,220,0.30)"
              strokeWidth={0.6}
            >
              {/* coda all'indietro */}
              <path d="M44 40 C36 44 30 52 26 56 C34 52 42 49 51 46 Z" />
              {/* corpo inclinato */}
              <ellipse cx="58" cy="42" rx="17" ry="11" transform="rotate(-14 58 42)" />
              {/* ala ripiegata (più scura) */}
              <path d="M50 34 C60 31 70 35 73 43 C66 46 56 45 49 41 Z" fill="#05050a" stroke="none" />
              {/* testa */}
              <circle cx="76" cy="30" r="7.5" />
              {/* becco verso destra */}
              <path d="M82 27 L96 30 L82 33 Z" />
              {/* occhio con bagliore viola */}
              <circle cx="78.5" cy="29" r="1.6" fill="#c9b6ff" filter="url(#dc-eye-glow)" stroke="none" />
              {/* zampe */}
              <path d="M56 52 L55 63 M62 52 L61 63" stroke="#05050a" strokeWidth={2} fill="none" />
              {/* piedini */}
              <path d="M52 63 L58 63 M58 63 L64 63" stroke="#05050a" strokeWidth={1.6} fill="none" />
            </g>
          </svg>
          )}
        </div>
      )}
    </div>
  );
};
