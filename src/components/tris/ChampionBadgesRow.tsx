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

// 🏅 Riga dei titoli. Solo icone + tooltip (titolo + descrizione).
// Le icone non guadagnate appaiono spente (grigie). Settimana/Mese/Tornei mostrano xN.
// Se passati `wins`/`elo`, mostra anche i titoli obiettivo (milestone).

interface ChampionBadgesRowProps {
  badges: ChampionBadges;
  /** Se passato, mostra anche l'icona "Tournament Champion" (xN) accanto ai titoli. */
  tournamentsWon?: number;
  /** Vittorie totali del profilo: sblocca i titoli Veteran/Gladiator/Warlord/Legend. */
  wins?: number;
  /** ELO del profilo: sblocca i titoli ELO Master (2500) / ELO Grandmaster (3000). */
  elo?: number;
  size?: "sm" | "md";
  className?: string;
}

export const ChampionBadgesRow = ({
  badges,
  tournamentsWon,
  wins,
  elo,
  size = "md",
  className = "",
}: ChampionBadgesRowProps) => {
  const iconCls = size === "sm" ? "w-6 h-6" : "w-8 h-8";

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

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`flex items-center gap-3 ${className}`}>
        <Badge
          icon={<CampioneIcon className={iconCls} active={badges.everChampion} />}
          active={badges.everChampion}
          title="Champion"
          desc="Titolo ottenuto raggiungendo la prima posizione in classifica almeno una volta."
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

        {/* 🎯 Titoli obiettivo (milestone) — separati da un divisore */}
        {showMilestones && <span className="w-px h-6 bg-white/15 mx-0.5 self-center" />}

        {typeof wins === "number" && (
          <>
            <Badge
              icon={<VeteranIcon className={iconCls} active={wins >= 50} />}
              active={wins >= 50}
              title="Challenger"
              desc="Titolo ottenuto vincendo 50 partite."
            />
            <Badge
              icon={<GladiatorIcon className={iconCls} active={wins >= 100} />}
              active={wins >= 100}
              title="Warrior"
              desc="Titolo ottenuto vincendo 100 partite."
            />
            <Badge
              icon={<WarlordIcon className={iconCls} active={wins >= 500} />}
              active={wins >= 500}
              title="Conqueror"
              desc="Titolo ottenuto vincendo 500 partite."
            />
            <Badge
              icon={<LegendIcon className={iconCls} active={wins >= 1000} />}
              active={wins >= 1000}
              title="Legend"
              desc="Titolo ottenuto vincendo 1000 partite."
            />
          </>
        )}

        {typeof elo === "number" && (
          <>
            <Badge
              icon={<EloMasterIcon className={iconCls} active={elo >= 2500} />}
              active={elo >= 2500}
              title="ELO Expert"
              desc="Titolo ottenuto raggiungendo i 2.500 punti ELO."
            />
            <Badge
              icon={<EloGrandmasterIcon className={iconCls} active={elo >= 3000} />}
              active={elo >= 3000}
              title="ELO Virtuoso"
              desc="Titolo ottenuto raggiungendo i 3.000 punti ELO."
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
};
