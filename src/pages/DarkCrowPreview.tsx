import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, MapPin, RotateCw, Moon, ShieldAlert, Loader2 } from "lucide-react";
import { DarkCrowAnimation } from "@/components/themes/DarkCrowAnimation";
import { useAdminRole } from "@/hooks/useAdminRole";

const COOLDOWN_MS = 20000;

/** Card finta in stile bacheca, tema Dark Crow. */
const MockCard = ({ active, playToken }: { active: boolean; playToken: number }) => (
  <div className="dc-frame relative w-[300px] select-none">
    <div className="dc-card relative overflow-hidden rounded-[0.8rem] bg-[#0c0a14]">
      {/* Foto (placeholder) */}
      <div className="relative flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-[#1c1636] via-[#120e22] to-[#08060f]">
        <span className="text-7xl font-bold text-white/10">S</span>
        <div className="absolute left-3 top-3 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
      </div>

      {/* Info */}
      <div className="space-y-2.5 p-4">
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg font-bold text-white">SMPSHOW</h3>
          <span className="text-base font-medium text-white/50">28 anni</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/45">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-purple-300" />
          <span className="truncate">Vicino alle tue parti</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-purple-400/15 px-2 py-0.5 text-xs font-medium text-purple-200">Donna</span>
          <span className="rounded-full bg-pink-400/15 px-2 py-0.5 text-xs font-medium text-pink-200">Omosessuale</span>
        </div>
        <div className="space-y-1 text-xs text-white/45">
          <div><span className="font-semibold text-white/60">Stato:</span> Fidanzato/a</div>
          <div><span className="font-semibold text-white/60">Cerca:</span> Incontri casuali</div>
        </div>
        <div className="flex gap-2 pt-1">
          <button className="flex h-9 flex-1 items-center justify-center gap-1 rounded-md border border-white/15 text-xs text-white/80">
            <Heart className="h-3.5 w-3.5" /> Mi Piace
          </button>
          <button className="flex h-9 flex-1 items-center justify-center gap-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-medium text-white">
            <MessageCircle className="h-3.5 w-3.5" /> Chat
          </button>
        </div>
      </div>
    </div>

    {/* Overlay animato del tema (corvo + atmosfera) */}
    <DarkCrowAnimation active={active} playToken={playToken} />
  </div>
);

export default function DarkCrowPreview() {
  // 🔒 Pagina di prototipo: visibile SOLO agli account admin.
  const { isAdmin, loading: adminLoading } = useAdminRole();

  // --- Card BACHECA: hover attiva l'atmosfera, il corvo parte se non in cooldown ---
  const [bachecaActive, setBachecaActive] = useState(false);
  const [bachecaToken, setBachecaToken] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const lastPlayed = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (lastPlayed.current === 0) {
        setCooldownLeft(0);
        return;
      }
      const elapsed = Date.now() - lastPlayed.current;
      setCooldownLeft(Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, []);

  const handleEnter = () => {
    setBachecaActive(true);
    const now = Date.now();
    if (now - lastPlayed.current >= COOLDOWN_MS) {
      lastPlayed.current = now;
      setBachecaToken((t) => t + 1);
    }
  };

  // --- Card ANTEPRIMA: autoplay all'ingresso + pulsante "Rivedi" ---
  const [previewToken, setPreviewToken] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setPreviewToken(1), 400);
    return () => clearTimeout(id);
  }, []);

  // Caricamento ruolo
  if (adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0814] text-white/70">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Blocco accesso ai non-admin
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#160d22] to-[#080610] px-6 text-center">
        <div className="max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-purple-300/70" />
          <h1 className="mb-2 text-xl font-bold text-white">Pagina riservata</h1>
          <p className="text-sm text-white/60">
            Questa anteprima è accessibile solo agli account amministratore.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#160d22] via-[#0f0a1a] to-[#080610] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center gap-2">
          <Moon className="h-6 w-6 text-purple-300" />
          <h1 className="text-2xl font-extrabold tracking-tight">
            Tema Dark Crow <span className="text-purple-300/70">(prototipo)</span>
          </h1>
        </div>
        <p className="mb-8 max-w-2xl text-sm text-white/60">
          Atmosfera notturna: luna, nebbia e lampi. Un corvo scende dall'alto, si posa sopra i pulsanti
          per qualche secondo e poi svolazza via. A riposo la card resta scura e statica; l'animazione
          parte al passaggio del cursore (in bacheca) o automaticamente (nell'anteprima del pannello).
        </p>

        <div className="grid gap-10 md:grid-cols-2">
          {/* BACHECA */}
          <div className="flex flex-col items-center">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-purple-300/70">
              Card in bacheca — passa il cursore
            </div>
            <div onMouseEnter={handleEnter} onMouseLeave={() => setBachecaActive(false)}>
              <MockCard active={bachecaActive} playToken={bachecaToken} />
            </div>
            <div className="mt-4 h-5 text-xs text-white/50">
              {cooldownLeft > 0 ? (
                <span>Corvo in riposo: <span className="font-semibold text-purple-300">{cooldownLeft}s</span> (ripassa il cursore dopo)</span>
              ) : bachecaToken > 0 ? (
                <span>Pronto: ripassa il cursore per richiamare il corvo</span>
              ) : (
                <span>Passa il cursore sulla card per richiamare il corvo</span>
              )}
            </div>
          </div>

          {/* ANTEPRIMA PANNELLO */}
          <div className="flex flex-col items-center">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-purple-300/70">
              Anteprima nel pannello — autoplay
            </div>
            <MockCard active playToken={previewToken} />
            <button
              onClick={() => setPreviewToken((t) => t + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:from-purple-500 hover:to-indigo-500"
            >
              <RotateCw className="h-4 w-4" /> Rivedi animazione
            </button>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
          <p className="mb-2 font-semibold text-white/80">Note prototipo</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Corvo, luna, nebbia e lampi sono fatti in casa (SVG + CSS), zero dipendenze esterne e zero problemi di licenza.</li>
            <li>In bacheca l'animazione parte all'hover con cooldown di 20s; nell'anteprima parte da sola.</li>
            <li>Il corvo definitivo si potrà sostituire con una Lottie rifinita senza cambiare la logica.</li>
            <li>Rispetta <code>prefers-reduced-motion</code> (se l'utente ha disattivato le animazioni di sistema, restano statiche).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
