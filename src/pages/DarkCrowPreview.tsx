import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, MapPin, RotateCw, Moon, ShieldAlert, Loader2, User, Trophy, Crown } from "lucide-react";
import { DarkCrowAnimation } from "@/components/themes/DarkCrowAnimation";
import { useAdminRole } from "@/hooks/useAdminRole";
import profileBadge from "@/assets/profile-badge.png";

const COOLDOWN_MS = 20000;

/** Card finta in stile bacheca, tema Dark Crow. */
const MockCard = ({ playToken }: { playToken: number }) => (
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
          <h3 className="text-lg font-bold dc-name">SMPSHOW</h3>
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
    <DarkCrowAnimation playToken={playToken} />
  </div>
);

/** Avatar con anello tematizzato "nero lucido". */
const Avatar = ({ size = 60 }: { size?: number }) => (
  <div className="dc-avatar">
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      S
    </div>
  </div>
);

/** Mini-contesto: avatar con anello + nickname (i tuoi match, like, classifica, partite). */
const AvatarContext = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <Avatar size={60} />
    <span className="text-sm font-bold dc-name">SMPSHOW</span>
    <span className="text-[11px] uppercase tracking-wide text-white/40">{label}</span>
  </div>
);

/** Card interna VERA (ProfileDialog): hero con grande rettangolo avatar +
 *  nome centrato + pillole + sezioni Stato/Cerca, tutto tematizzato. */
const InternalCard = () => (
  <div className="w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1226] via-[#140e1f] to-[#0a0810]">
    {/* Hero con rettangolo avatar */}
    <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6">
      <div className="relative mx-auto w-fit">
        <div className="dc-frame">
          <div className="relative flex h-64 w-52 items-center justify-center overflow-hidden rounded-3xl border-4 border-[#0a0810] bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-7xl font-bold text-white/15">S</span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        </div>
        <div className="absolute -right-3 -top-3 h-12 w-12 rotate-12 overflow-hidden rounded-2xl shadow-2xl">
          <img src={profileBadge} alt="" className="h-full w-full object-contain" />
        </div>
      </div>
    </div>

    {/* Contenuto */}
    <div className="space-y-5 px-6 pb-6">
      <div className="space-y-3 text-center">
        <h2 className="dc-name text-3xl font-bold">SMPSHOW</h2>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">28 anni</span>
          <span className="rounded-full bg-blue-500/10 px-4 py-1.5 text-sm font-semibold text-blue-400"><User className="mr-1 inline h-3.5 w-3.5" />Donna</span>
          <span className="rounded-full bg-pink-500/10 px-4 py-1.5 text-sm font-semibold text-pink-400"><User className="mr-1 inline h-3.5 w-3.5" />Omosessuale</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-white/50">
          <MapPin className="h-4 w-4" /><span className="text-sm">Vicino alle tue parti</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <User className="dc-icon h-5 w-5" /><span className="dc-name">Stato relazionale</span>
        </h3>
        <div className="text-base font-medium text-white/80">Fidanzato/a</div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <User className="dc-icon h-5 w-5" /><span className="dc-name">Cosa cerca</span>
        </h3>
        <div className="text-base font-medium text-white/80">Incontri casuali</div>
      </div>
    </div>
  </div>
);

/** Card statistiche VERA (ProfileStatsDialog): header viola con avatar+nome,
 *  sotto parte tematizzata con ELO grande e medaglie (niente V/S). */
const StatsCard = () => (
  <div className="w-[300px] overflow-hidden rounded-2xl border border-white/10">
    <div className="flex flex-col items-center gap-3 bg-gradient-to-br from-primary/40 via-purple-500/30 to-pink-500/40 p-6 pb-12">
      <Avatar size={88} />
      <span className="dc-name text-2xl font-bold drop-shadow-lg">SMPSHOW</span>
    </div>
    <div className="dc-shine-bg -mt-6 rounded-t-3xl px-6 py-5 text-center">
      <p className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-xs font-bold uppercase tracking-[0.3em] text-transparent">
        ELO
      </p>
      <p className="text-4xl font-bold text-primary drop-shadow-[0_0_12px_rgba(244,114,182,0.5)]">1850</p>
      <div className="mt-3 flex justify-center gap-2">
        <Crown className="h-7 w-7 text-amber-400" />
        <Trophy className="h-7 w-7 text-amber-300" />
        <Trophy className="h-7 w-7 text-purple-300" />
      </div>
    </div>
  </div>
);

export default function DarkCrowPreview() {
  // 🔒 Pagina di prototipo: visibile SOLO agli account admin.
  const { isAdmin, loading: adminLoading } = useAdminRole();

  // --- Card BACHECA: l'hover avvia il ciclo (se non in cooldown 20s) ---
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
          Atmosfera notturna: un corvo reale, la luna, la nebbia e i lampi appaiono insieme in
          dissolvenza, restano un istante e poi si dissolvono lentamente tutti insieme. In bacheca
          parte al passaggio del cursore (cooldown 20s); nell'anteprima del pannello parte da sola
          (e si rivede ad ogni click sul tema).
        </p>

        <div className="grid gap-10 md:grid-cols-2">
          {/* BACHECA */}
          <div className="flex flex-col items-center">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-purple-300/70">
              Card in bacheca — passa il cursore
            </div>
            <div onMouseEnter={handleEnter}>
              <MockCard playToken={bachecaToken} />
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
            <MockCard playToken={previewToken} />
            <button
              onClick={() => setPreviewToken((t) => t + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:from-purple-500 hover:to-indigo-500"
            >
              <RotateCw className="h-4 w-4" /> Rivedi animazione
            </button>
          </div>
        </div>

        {/* --- ALTRI CONTESTI: come si vede il tema altrove --- */}
        <div className="mt-14">
          <div className="mb-5 text-xs font-semibold uppercase tracking-wider text-purple-300/70">
            Come si vede negli altri contesti
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <AvatarContext label="I tuoi match" />
            <AvatarContext label="Like ricevuti" />
            <AvatarContext label="Classifica" />
            <AvatarContext label="Durante le partite" />
          </div>

          <div className="flex flex-wrap items-start gap-8">
            <div>
              <div className="mb-3 text-xs text-white/40">Card interna (profilo aperto)</div>
              <InternalCard />
            </div>
            <div>
              <div className="mb-3 text-xs text-white/40">Card apribile (statistiche, in partita / classifica)</div>
              <StatsCard />
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
          <p className="mb-2 font-semibold text-white/80">Note prototipo</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Corvo (WebP animato) e luna sono immagini reali; nebbia e lampi sono CSS.</li>
            <li>La scena (corvo + luna + nebbia + lampi) appare e si dissolve insieme. In bacheca parte all'hover con cooldown 20s; nell'anteprima parte da sola.</li>
            <li>Negli altri contesti il tema applica l'anello avatar e il nickname "nero lucido" (niente scena/tempesta, solo come l'oro premium).</li>
            <li>Rispetta <code>prefers-reduced-motion</code> (se l'utente ha disattivato le animazioni, restano statiche).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
