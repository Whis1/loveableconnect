import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChampionBadges } from "@/lib/championBadges";
import { CampioneIcon, SettimanaIcon, MeseIcon, TorneiIcon } from "@/lib/championIcons";

// 🏅 Riga dei titoli. Solo icone + tooltip (titolo + descrizione).
// Le icone non guadagnate appaiono spente (grigie). Settimana/Mese/Tornei mostrano xN.

interface ChampionBadgesRowProps {
  badges: ChampionBadges;
  /** Se passato, mostra anche l'icona "Tornei Vinti" (xN) accanto ai titoli. */
  tournamentsWon?: number;
  size?: "sm" | "md";
  className?: string;
}

export const ChampionBadgesRow = ({ badges, tournamentsWon, size = "md", className = "" }: ChampionBadgesRowProps) => {
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

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`flex items-center gap-3 ${className}`}>
        <Badge
          icon={<CampioneIcon className={iconCls} active={badges.everChampion} />}
          active={badges.everChampion}
          title="Campione"
          desc="Titolo ottenuto arrivando primo in classifica almeno una volta."
        />
        <Badge
          icon={<SettimanaIcon className={iconCls} active={badges.weeks > 0} />}
          active={badges.weeks > 0}
          count={badges.weeks}
          title="Campione della Settimana"
          desc="Titolo ottenuto restando primo in classifica per una settimana intera."
        />
        <Badge
          icon={<MeseIcon className={iconCls} active={badges.months > 0} />}
          active={badges.months > 0}
          count={badges.months}
          title="Campione del Mese"
          desc="Titolo ottenuto restando primo in classifica per un mese intero."
        />
        {typeof tournamentsWon === "number" && (
          <Badge
            icon={<TorneiIcon className={iconCls} active={tournamentsWon > 0} />}
            active={tournamentsWon > 0}
            count={tournamentsWon}
            title="Tornei Vinti"
            desc="Numero di tornei vinti aggiudicandosi la finale."
          />
        )}
      </div>
    </TooltipProvider>
  );
};
