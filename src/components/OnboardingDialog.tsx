import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Check, Loader2 } from "lucide-react";
import { LoveCompassIcon } from "@/lib/championIcons";
import loveableLogo from "@/assets/auth-logo.png";

// 🧭 ONBOARDING al primo accesso nella bacheca.
//
// Flusso a step, in tema col sito:
//   step 0 → intro di benvenuto
//   step 1 → "Chi vuoi conoscere?" (selezione MULTIPLA di genere) → salva nei filtri
//   step 2..N → domande sulla personalità (a click) → salvate sul profilo (DB)
//   fine → marca onboarding_completed = true
//
// Le risposte personalità alimenteranno il matching di "Tenta il Destino".

interface OnboardingDialogProps {
  userId: string;
  // chiamata con i generi scelti, così Explore li applica come filtri salvati
  onComplete: (selectedGenders: string[]) => void;
}

const GENDER_CHOICES = [
  { value: "male", label: "Uomo" },
  { value: "female", label: "Donna" },
  { value: "transgender", label: "Transgender" },
  { value: "genderfluid", label: "Genderfluid" },
  { value: "non-binary", label: "Non binario" },
];

interface TraitQuestion {
  id: string;
  text: string;
  options: string[];
}

// Pool di domande sulla PERSONALITÀ e lo STILE dell'utente (come sei tu),
// pescate a caso. NEUTRE rispetto all'intento: la gente entra per amore, ma
// anche per divertimento, incontri occasionali o nuove amicizie. Niente
// domande che presuppongono "anima gemella". Servono a descrivere CHI sei,
// per suggerirti alle persone più affini in "Tenta il Destino".
const TRAIT_POOL: TraitQuestion[] = [
  // 🎯 Intento — la più importante, copre TUTTI i motivi per cui si entra
  { id: "intent", text: "Cosa cerchi qui?", options: ["Divertimento e leggerezza", "Incontri occasionali 🔥", "Nuove amicizie", "Una relazione seria", "Sono qui per curiosità"] },
  { id: "character", text: "Come ti descriveresti?", options: ["Solare ed estroverso/a", "Calmo/a e riflessivo/a", "Spiritoso/a e ironico/a", "Diretto/a e senza filtri"] },
  { id: "free_time", text: "Nel tempo libero ti trovo...", options: ["Fuori a far festa", "A casa in relax", "A fare sport", "Tra arte, libri e musica"] },
  { id: "social_energy", text: "In mezzo alla gente sei...", options: ["L'anima della festa", "A mio agio con pochi amici", "Dipende dall'umore", "Più riservato/a"] },
  { id: "first_thing", text: "Cosa noti per prima in una persona?", options: ["Il sorriso", "Il senso dell'umorismo", "Il fisico e lo stile", "Come ti fa sentire"] },
  { id: "weekend_you", text: "Il tuo weekend perfetto?", options: ["Festa e movida", "Avventura all'aperto", "Relax totale", "Amici e chiacchiere"] },
  { id: "energy", text: "La tua energia è...", options: ["Mattiniero/a", "Nottambulo/a, vivo di notte", "Equilibrata", "Caotica ma felice"] },
  { id: "vibe", text: "Che impressione dai di solito?", options: ["Solare e alla mano", "Energico/a e travolgente", "Riservato/a e intrigante", "Tranquillo/a e genuino/a"] },
  { id: "flirt", text: "Quando flirti sei...", options: ["Diretto/a e sicuro/a", "Giocoso/a e ironico/a", "Timido/a ma curioso/a", "Lascio fare all'altro/a"] },
  { id: "free_tonight", text: "Stasera tipo...", options: ["Uscita last-minute", "Drink in un locale", "Serie TV e divano", "Vedo come gira 😏"] },
  { id: "passion", text: "Cosa ti accende di più?", options: ["Viaggi e nuove esperienze", "Buon cibo e compagnia", "Musica e concerti", "Una bella conversazione"] },
  { id: "rhythm", text: "Il tuo ritmo è più...", options: ["Vivo e pieno di cose", "Lento e godereccio", "Imprevedibile", "Dipende dalla giornata"] },
];

function shuffle<T>(a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

export const OnboardingDialog = ({ userId, onComplete }: OnboardingDialogProps) => {
  // 6 domande personalità random per questa sessione
  const traitQuestions = useMemo<TraitQuestion[]>(() => shuffle(TRAIT_POOL).slice(0, 6), []);

  // step: 0 = intro, 1 = generi, 2..(2+N-1) = domande, poi salva
  const [step, setStep] = useState(0);
  const [genders, setGenders] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const totalQuestionSteps = traitQuestions.length;
  // step della domanda corrente (0-based) quando step >= 2
  const questionIdx = step - 2;

  const toggleGender = (v: string) =>
    setGenders((prev) => (prev.includes(v) ? prev.filter((g) => g !== v) : [...prev, v]));

  const finish = async () => {
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ destiny_traits: answers, onboarding_completed: true } as any)
        .eq("id", userId);
    } catch {
      // Anche se il salvataggio fallisce, non blocchiamo l'utente: chiudiamo.
    } finally {
      setSaving(false);
      onComplete(genders);
    }
  };

  const answerQuestion = (option: string) => {
    const q = traitQuestions[questionIdx];
    const next = { ...answers, [q.id]: option };
    setAnswers(next);
    if (questionIdx + 1 < totalQuestionSteps) {
      setStep((s) => s + 1);
    } else {
      // ultima domanda → salva
      void finishWith(next);
    }
  };

  // come finish ma con risposte passate (evita problema setState asincrono sull'ultima)
  const finishWith = async (finalAnswers: Record<string, string>) => {
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ destiny_traits: finalAnswers, onboarding_completed: true } as any)
        .eq("id", userId);
    } catch {
      /* non bloccare */
    } finally {
      setSaving(false);
      onComplete(genders);
    }
  };

  // Barra di avanzamento (intro non conta; generi = 1 step; poi le domande)
  const totalSteps = 1 + totalQuestionSteps; // generi + domande
  const currentProgress =
    step <= 1 ? (step === 1 ? 1 : 0) : Math.min(1 + questionIdx + 1, totalSteps);
  const progressPct = Math.round((currentProgress / totalSteps) * 100);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-gradient-to-br from-gray-900 via-purple-950/95 to-gray-900 border border-pink-500/30 shadow-2xl shadow-pink-500/20 overflow-hidden">
        {/* Barra avanzamento (nascosta nell'intro) */}
        {step > 0 && (
          <div className="h-1.5 w-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        <div className="p-7 sm:p-9">
          {/* ───────── STEP 0: INTRO ───────── */}
          {step === 0 && (
            <div className="text-center">
              <img
                src={loveableLogo}
                alt="LoveableConnect"
                className="mx-auto mb-5 w-24 h-24 object-contain drop-shadow-[0_4px_20px_rgba(236,72,153,0.4)]"
              />
              <h2 className="text-2xl font-black bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 bg-clip-text text-transparent mb-3">
                Benvenuto/a su LoveableConnect! 💜
              </h2>
              <p className="text-gray-300 leading-relaxed mb-2">
                Prima di iniziare, aiutaci a conoscerti: bastano pochi click.
              </p>
              <p className="text-sm text-gray-400 leading-relaxed mb-7">
                Personalizzeremo la tua esperienza e ti faremo trovare dalle
                persone più in sintonia con te.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => setStep(1)}
                  size="lg"
                  className="px-10 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:via-rose-600 hover:to-purple-600 text-white font-bold shadow-lg shadow-pink-500/30"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Iniziamo
                </Button>
              </div>
            </div>
          )}

          {/* ───────── STEP 1: CHI CERCHI (multi) ───────── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1.5">Chi vuoi conoscere?</h2>
              <p className="text-sm text-gray-400 mb-5">
                Scegli una o più opzioni. Le useremo per mostrarti subito i profili giusti.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-7">
                {GENDER_CHOICES.map((g) => {
                  const active = genders.includes(g.value);
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => toggleGender(g.value)}
                      className={`relative px-4 py-3.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                        active
                          ? "border-pink-400 bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-white shadow-lg shadow-pink-500/20"
                          : "border-white/15 bg-white/[0.03] text-gray-300 hover:border-pink-400/50 hover:bg-white/[0.06]"
                      }`}
                    >
                      {active && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                      {g.label}
                    </button>
                  );
                })}
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={genders.length === 0}
                size="lg"
                className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:via-rose-600 hover:to-purple-600 text-white font-bold shadow-lg shadow-pink-500/30 disabled:opacity-40"
              >
                Continua
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* ───────── STEP 2..N: DOMANDE PERSONALITÀ ───────── */}
          {step >= 2 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-pink-300/80">
                <LoveCompassIcon className="w-4 h-4" />
                Domanda {questionIdx + 1} di {totalQuestionSteps}
              </div>
              <h2 className="text-xl font-bold text-white mb-5">
                {traitQuestions[questionIdx].text}
              </h2>

              {saving ? (
                <div className="py-10 flex flex-col items-center gap-3 text-gray-300">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
                  <p className="text-sm">Salvataggio in corso…</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {traitQuestions[questionIdx].options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => answerQuestion(opt)}
                      className="w-full text-left px-4 py-3.5 rounded-xl border-2 border-white/15 bg-white/[0.03] text-gray-200 font-medium hover:border-pink-400 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-purple-500/20 hover:text-white transition-all"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-6 text-center text-[11px] leading-relaxed text-gray-500">
                Queste risposte ci aiutano a capire che tipo sei e a suggerire il
                tuo profilo alle persone più in sintonia con te nel sistema
                “Tenta il Destino”.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
