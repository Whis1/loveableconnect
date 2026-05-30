import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChampionBadges } from "@/lib/championBadges";
import {
  CampioneIcon,
  SettimanaIcon,
  MeseIcon,
  TorneiIcon,
  VeteranIcon,
  GladiatorIcon,
  WarlordIcon,
  LegendIcon,
  EloMasterIcon,
  EloGrandmasterIcon,
} from "@/lib/championIcons";

// 🏅 Titoli del profilo. Solo icone + tooltip (titolo + descrizione).
// Le icone non guadagnate appaiono spente (grigie).
// - layout="inline" (default): titoli di classifica + obiettivi sulla STESSA
//   riga, separati da una sbarra divisoria.
// - layout="stacked": titoli di classifica SOPRA, obiettivi SOTTO (2 righe).

interface ChampionBadgesRowProps {
  badges: ChampionBadges;
  /** Se passato, mostra anche l'icona "Tournament Champion" (xN). */
  tournamentsWon?: number;
  /** Vittorie totali del profilo: sblocca Rising/Shining/Superstar/Legend. */
  wins?: number;
  /** ELO del profilo: sblocca ELO Expert (2500) / ELO Virtuoso (3000). */
  elo?: number;
  /** Se true, il profilo è ATTUALMENTE primo in classifica → sblocca Champion subito. */
  isCurrentlyFirst?: boolean;
  /** Disposizione: una riga con divisore ("inline") o due righe ("stacked"). */
  layout?: "inline" | "stacked";
  size?: "sm" | "md";
  className?: string;
}

export const ChampionBadgesRow = ({
  badges,
  tournamentsWon,
  wins,
  elo,
  isCurrentlyFirst = false,
  layout = "inline",
  size = "md",
  className = "",
}: ChampionBadgesRowProps) => {
  const iconCls = size === "sm" ? "w-6 h-6" : "w-8 h-8";

  // 🏆 Champion: ottenuto se è stato #1 in passato OPPURE se è primo ORA.
  const isChampion = badges.everChampion || isCurrentlyFirst;

  const Badge = ({
    icon,
    active,
    count,
    title,
    desc,
  }: {
    icon: React.ReactNode;
    active: boolean;
    count?: number;
    title: string;
    desc: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`relative flex items-center justify-center cursor-help transition-transform hover:scale-110 ${
            active ? "" : "opacity-40 grayscale"
          }`}
        >
          {icon}
          {typeof count === "number" && count > 0 && (
            <span className="absolute -bottom-1 -right-1 px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-pink-600 text-white text-[9px] font-black leading-none border border-pink-300/60">
              {count}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-left leading-relaxed">
        <strong>{title}</strong>
        <br />
        {desc}
      </TooltipContent>
    </Tooltip>
  );

  const showMilestones = typeof wins === "number" || typeof elo === "number";

  // Gruppo 1 — titoli di classifica
  const rankBadges = (
    <>
      <Badge
        icon={<CampioneIcon className={iconCls} active={isChampion} />}
        active={isChampion}
        title="Champion"
        desc="Titolo ottenuto raggiungendo per la prima volta la vetta della classifica."
      />
      <Badge
        icon={<SettimanaIcon className={iconCls} active={badges.weeks > 0} />}
        active={badges.weeks > 0}
        count={badges.weeks}
        title="Weekly Champion"
        desc="Titolo ottenuto restando in prima posizione nella classifica per una settimana intera."
      />
      <Badge
        icon={<MeseIcon className={iconCls} active={badges.months > 0} />}
        active={badges.months > 0}
        count={badges.months}
        title="Monthly Champion"
        desc="Titolo ottenuto restando in prima posizione nella classifica per un mese intero."
      />
      {typeof tournamentsWon === "number" && (
        <Badge
          icon={<TorneiIcon className={iconCls} active={tournamentsWon > 0} />}
          active={tournamentsWon > 0}
          count={tournamentsWon}
          title="Tournament Champion"
          desc="Titolo ottenuto vincendo la finale di un torneo."
        />
      )}
    </>
  );

  // Gruppo 2 — titoli obiettivo (milestone)
  const milestoneBadges = showMilestones ? (
    <>
      {typeof wins === "number" && (
        <>
          <Badge
            icon={<VeteranIcon className={iconCls} active={wins >= 50} />}
            active={wins >= 50}
            title="Cunning Mind"
            desc="Titolo ottenuto vincendo 50 partite."
          />
          <Badge
            icon={<GladiatorIcon className={iconCls} active={wins >= 100} />}
            active={wins >= 100}
            title="Strategic Mind"
            desc="Titolo ottenuto vincendo 100 partite."
          />
          <Badge
            icon={<WarlordIcon className={iconCls} active={wins >= 500} />}
            active={wins >= 500}
            title="Flawless Mind"
            desc="Titolo ottenuto vincendo 500 partite."
          />
          <Badge
            icon={<LegendIcon className={iconCls} active={wins >= 1000} />}
            active={wins >= 1000}
            title="Absolute Mind"
            desc="Titolo ottenuto vincendo 1000 partite."
          />
        </>
      )}
      {typeof elo === "number" && (
        <>
          <Badge
            icon={<EloMasterIcon className={iconCls} active={elo >= 2500} />}
            active={elo >= 2500}
            title="Apex"
            desc="Titolo ottenuto raggiungendo i 2.500 punti ELO."
          />
          <Badge
            icon={<EloGrandmasterIcon className={iconCls} active={elo >= 3000} />}
            active={elo >= 3000}
            title="Zenith"
            desc="Titolo ottenuto raggiungendo i 3.000 punti ELO."
          />
        </>
      )}
    </>
  ) : null;

  return (
    <TooltipProvider delayDuration={150}>
      {layout === "stacked" ? (
        // 📦 Due righe: classifica sopra, obiettivi sotto
        <div className={`flex flex-col items-center gap-2.5 ${className}`}>
          <div className="flex items-center gap-3">{rankBadges}</div>
          {milestoneBadges && <div className="flex items-center gap-3">{milestoneBadges}</div>}
        </div>
      ) : (
        // ➖ Una riga: classifica + divisore + obiettivi
        <div className={`flex items-center gap-3 ${className}`}>
          {rankBadges}
          {milestoneBadges && <span className="w-px h-6 bg-white/15 mx-0.5 self-center" />}
          {milestoneBadges}
        </div>
      )}
    </TooltipProvider>
  );
};
