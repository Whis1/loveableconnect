/**
 * Overlay del tema "Dark Crow" (PROTOTIPO) — modello "solo dissolvenza".
 *
 * Niente movimento: corvo (WebP animato, reale) + luna + nebbia + lampi
 * APPAIONO insieme in dissolvenza, restano un istante, poi si DISSOLVONO
 * lentamente tutti insieme. Un ciclo dura ~8s ed è guidato interamente da
 * CSS (animazione `dc-cycle` su `.dc-scene`).
 *
 * Ogni cambio di `playToken` ri-monta la scena (via key) e fa ripartire il
 * ciclo da capo. La logica di trigger (hover + cooldown in bacheca, click sul
 * tema nel pannello personalizzazione) sta nel componente padre.
 */

const CROW_SRC = "/themes/dark-crow/crow.webp";

interface DarkCrowAnimationProps {
  playToken: number;
}

export const DarkCrowAnimation = ({ playToken }: DarkCrowAnimationProps) => {
  if (!playToken) return null;

  return (
    <div className="dc-scene" key={playToken}>
      <img className="dc-moon" src="/themes/dark-crow/moon.png" alt="" aria-hidden="true" draggable={false} />
      <div className="dc-fog dc-fog-mid" />
      <div className="dc-fog dc-fog-bottom" />
      <div className="dc-lightning dc-lightning-cycle" />
      <img
        className="dc-crow-static"
        src={CROW_SRC}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </div>
  );
};
