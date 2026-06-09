import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProfileGridCard } from "@/components/ProfileGridCard";
import { useLikes } from "@/hooks/useLikes";
import { X, ArrowRight, Loader2, LogOut } from "lucide-react";
import { LoveCompassIcon } from "@/lib/championIcons";
import { calculateAge } from "@/lib/utils";
import loveableLogo from "@/assets/loveable-connect-icon.webp";

// 🔮 "Tenta il Destino" — minigioco di matching a click.
// Flusso: scegli genere+orientamento desiderati (FILTRO reale) → rispondi a un
// set di domande random a click (scenografiche) → ricerca animata 7-8s → appare
// UNA card profilo compatibile (la stessa ProfileGridCard, con Mi Piace/Chat
// reali) + pulsante "Scarta" che ricerca il prossimo. Chiudere = ricomincia.

interface DestinyGameProps {
  currentUserId: string;
  onClose: () => void;
  onMatch?: (profileName: string, profileAvatar: string | null) => void;
}

type Phase = "intro" | "questions" | "searching" | "result" | "empty";

// ── Opzioni genere / orientamento desiderato (filtrano davvero) ──────────────
const GENDER_OPTIONS = [
  { value: "male", label: "Uomo", aliases: ["male", "uomo", "m"] },
  { value: "female", label: "Donna", aliases: ["female", "donna", "f"] },
  { value: "non-binary", label: "Non binario", aliases: ["non-binary", "non binario", "nonbinary", "genderfluid", "transgender", "trans"] },
  { value: "any", label: "Indifferente", aliases: [] },
];
const ORIENTATION_OPTIONS = [
  { value: "heterosexual", label: "Eterosessuale", aliases: ["heterosexual", "eterosessuale", "etero"] },
  { value: "homosexual", label: "Omosessuale", aliases: ["homosexual", "omosessuale", "omo", "gay", "lesbica"] },
  { value: "bisexual", label: "Bisessuale", aliases: ["bisexual", "bisessuale", "bi"] },
  { value: "pansexual", label: "Pansessuale", aliases: ["pansexual", "pansessuale", "pan"] },
];

// ── Domande FISSE (sempre presenti) ──────────────────────────────────────────
// age_band e spicy_seek NON sono scenografiche: filtrano davvero la ricerca
// (fascia d'età del profilo + coerenza tra cosa cerchi tu e cosa cerca l'altro).
const FIXED_QUESTIONS: DestinyQuestion[] = [
  {
    id: "zodiac",
    text: "Qual è il tuo segno zodiacale?",
    options: ["Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine", "Bilancia", "Scorpione", "Sagittario", "Capricorno", "Acquario", "Pesci"],
    grid: true,
  },
  {
    id: "age_band",
    text: "Che fascia d'età cerchi?",
    options: ["18-25", "26-35", "36-45", "46-60", "60+"],
  },
  {
    id: "spicy_seek",
    text: "Cosa cerchi davvero qui?",
    options: ["L'amore della vita", "Una storia seria", "Avventure leggere", "Solo divertimento 🔥"],
  },
];

// ── Domande a tema in base a "Cosa cerchi davvero qui?" ──────────────────────
// Chi cerca divertimento riceve domande piccanti/provocanti; chi cerca una
// storia seria riceve domande romantiche/di coppia. Le NEUTRE (leggere)
// stanno in entrambi i mazzi per dare varieta'.
const NEUTRAL_POOL: DestinyQuestion[] = [
  { id: "travel", text: "La vacanza dei sogni?", options: ["Spiaggia e relax", "Città d'arte", "Montagna e natura", "Viaggio zaino in spalla"] },
  { id: "music", text: "La colonna sonora della tua vita?", options: ["Pop", "Rock", "Indie", "Musica classica", "Hip-hop / Rap"] },
  { id: "weekend", text: "Il weekend perfetto?", options: ["Fuori a esplorare", "A casa in pieno relax", "Sport e attività", "Cultura: mostre, libri, teatro"] },
  { id: "cook", text: "In cucina sei...", options: ["Uno chef provetto", "Cavo solo l'essenziale", "Disastro totale (ordino)", "Adoro provare ricette nuove"] },
  { id: "morning", text: "Mattiniero o nottambulo?", options: ["Sveglia all'alba", "Il mio momento è la sera", "Dipende dai giorni", "Dormo appena posso"] },
  { id: "pet", text: "Animali?", options: ["Amo i cani", "Team gatti", "Tutti gli animali!", "Meglio senza"] },
  { id: "social", text: "Quanto sei social?", options: ["Sempre in mezzo alla gente", "Pochi ma buoni", "Dipende dall'umore", "Più tipo casa e relax"] },
  { id: "spontaneity", text: "Cosa ti attrae di più?", options: ["L'intelligenza", "Il senso dell'umorismo", "La gentilezza", "L'aspetto e lo stile"] },
  { id: "season", text: "La tua stagione del cuore?", options: ["Primavera", "Estate", "Autunno", "Inverno"] },
  { id: "risk", text: "Quanto sei avventuroso/a?", options: ["Vivo per il brivido", "Mi piace un rischio calcolato", "Meglio la sicurezza", "Dipende"] },
];

// 💘 Mazzo SERIO: amore, coppia, futuro insieme.
const SERIOUS_POOL: DestinyQuestion[] = [
  { id: "evening", text: "La serata ideale?", options: ["Cena a lume di candela", "Serata tra amici", "Film e coccole sul divano", "Avventura all'ultimo minuto"] },
  { id: "love_lang", text: "Come dimostri affetto?", options: ["Con le parole", "Con i gesti", "Con il tempo insieme", "Con i regali"] },
  { id: "if_fight", text: "E se litigaste in coppia, cosa faresti?", options: ["Ne parlo subito", "Mi prendo un momento", "Cerco un compromesso", "Sdrammatizzo con ironia"] },
  { id: "if_surprise", text: "Il/la partner ti organizza una sorpresa: tu...", options: ["Adoro le sorprese!", "Mi imbarazzo un po'", "Preferisco saperlo prima", "Ricambio subito"] },
  { id: "ideal_date", text: "Il primo appuntamento ideale?", options: ["Aperitivo informale", "Passeggiata e chiacchiere", "Qualcosa di originale", "Cena elegante"] },
  { id: "future", text: "Come ti vedi tra 5 anni?", options: ["In una relazione stabile", "A viaggiare per il mondo", "Realizzato nel lavoro", "Vivo alla giornata"] },
  { id: "if_far", text: "E se l'anima gemella vivesse lontano?", options: ["La distanza non è un problema", "Ci proverei volentieri", "Preferisco vicinanza", "Dipende dal feeling"] },
  { id: "if_gift", text: "Il regalo che vorresti ricevere?", options: ["Qualcosa di fatto a mano", "Un'esperienza insieme", "Una sorpresa romantica", "Qualcosa di utile"] },
  { id: "ideal_partner", text: "Il/la partner ideale dev'essere...", options: ["Dolce e premuroso/a", "Ambizioso/a e determinato/a", "Divertente e solare", "Fedele e presente"] },
  { id: "romance", text: "Il gesto romantico che ti scioglie?", options: ["Una lettera scritta a mano", "Una sorpresa inaspettata", "Le piccole attenzioni quotidiane", "Un viaggio organizzato per due"] },
  { id: "family", text: "Famiglia e futuro?", options: ["Sogno una famiglia", "Prima la coppia, poi si vedrà", "Convivenza assoluta", "Un passo alla volta"] },
  { id: "sunday", text: "La domenica perfetta in coppia?", options: ["Colazione a letto", "Pranzo dai parenti", "Gita fuori porta", "Relax totale insieme"] },
];

// 🔥 Mazzo PICCANTE: provocante, eccitante, da incontri leggeri.
const SPICY_POOL: DestinyQuestion[] = [
  { id: "spicy_first", text: "Al primo appuntamento, un bacio...", options: ["Solo se scatta la scintilla", "Assolutamente sì", "Meglio aspettare", "Chi lo sa… 😏"] },
  { id: "spicy_temp", text: "Come ti descriveresti?", options: ["Romantico/a inguaribile", "Passionale e intenso/a", "Giocoso/a e malizioso/a", "Un mistero da scoprire"] },
  { id: "spicy_msg", text: "Ricevi un messaggio audace a tarda notte. Tu...", options: ["Sorrido e rispondo subito", "Mi incuriosisco", "Dipende da chi lo manda", "Preferisco le cose lente"] },
  { id: "spicy_dream", text: "Il tuo lato segreto è più...", options: ["Tenero e coccoloso", "Audace e intraprendente", "Timido ma curioso", "Esplosivo 🔥"] },
  { id: "spicy_replay", text: "Dopo una notte di fuoco...", options: ["Si replica, assolutamente", "Vediamo come mi sento", "Ognuno per la sua strada", "Dipende dalla notte 😏"] },
  { id: "spicy_spark", text: "Cosa ti accende subito?", options: ["Uno sguardo intenso", "Un messaggio audace", "Un profumo irresistibile", "Il proibito"] },
  { id: "spicy_weapon", text: "La tua arma di seduzione?", options: ["Lo sguardo", "Le parole giuste", "Il sorriso malizioso", "Il mistero"] },
  { id: "spicy_drink", text: "Il drink di una serata piccante?", options: ["Tequila, dritti al punto", "Vino rosso, con calma", "Cocktail colorato", "Niente alcol, sono già pericoloso/a"] },
  { id: "spicy_place", text: "L'appuntamento più eccitante?", options: ["A casa, divano e poca luce", "Locale buio e musica", "Sotto le stelle", "Dove capita, improvvisando"] },
  { id: "spicy_text", text: "Il messaggio che ti conquista?", options: ["Diretto e senza giri", "Un indizio malizioso", "Una foto intrigante", "Quello alle 2 di notte"] },
];

// 3 fisse + 7 a tema = 10 domande totali.
const TOTAL_QUESTIONS = 10;

// Compone le 7 domande a tema: 4 dal mazzo dell'intento + 3 neutre, mescolate.
const buildThemedQuestions = (seekAnswer: string): DestinyQuestion[] => {
  const intent = userIntentFromAnswer(seekAnswer);
  const themed = intent === "fun" ? SPICY_POOL : SERIOUS_POOL;
  return shuffle([
    ...shuffle(themed).slice(0, 4),
    ...shuffle(NEUTRAL_POOL).slice(0, 3),
  ]);
};

interface DestinyQuestion {
  id: string;
  text: string;
  options: string[];
  grid?: boolean;
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const matchesAlias = (raw: string | null, opt: { value: string; aliases: string[] }): boolean => {
  if (opt.value === "any") return true;
  if (!raw) return false;
  const k = raw.toLowerCase().trim();
  return k === opt.value || opt.aliases.includes(k);
};

// ── Coerenza vera tra risposte e profili ─────────────────────────────────────

// Fasce d'età della domanda fissa → range numerico.
const AGE_BANDS: Record<string, [number, number]> = {
  "18-25": [18, 25],
  "26-35": [26, 35],
  "36-45": [36, 45],
  "46-60": [46, 60],
  "60+": [60, 120],
};

// Cosa dichiara di cercare un profilo (da relationship_type + looking_for,
// con tutte le varianti storiche italiano/inglese presenti nel DB).
type ProfileIntent = "serious" | "casual" | "friendship" | "open" | null;
const profileIntent = (p: { relationship_type?: string | null; looking_for?: string[] | null }): ProfileIntent => {
  const raw = [p.relationship_type || "", ...(p.looking_for || [])].map((s) => String(s).toLowerCase().trim());
  if (raw.some((v) => ["serious", "relazione seria", "serious relationship"].includes(v))) return "serious";
  if (raw.some((v) => ["casual", "incontri casuali", "casual dating"].includes(v))) return "casual";
  if (raw.some((v) => ["open", "relazione aperta", "open relationship"].includes(v))) return "open";
  if (raw.some((v) => ["friendship", "amicizia"].includes(v))) return "friendship";
  return null;
};

// Cosa cerca l'utente, dalla risposta alla domanda fissa "Cosa cerchi davvero qui?".
const userIntentFromAnswer = (answer: string | undefined): "serious" | "fun" | null => {
  if (!answer) return null;
  if (answer === "L'amore della vita" || answer === "Una storia seria") return "serious";
  if (answer === "Avventure leggere" || answer.startsWith("Solo divertimento")) return "fun";
  return null;
};

// true = contraddizione netta (mai mostrare): chi cerca divertimento non deve
// vedere chi dichiara una relazione seria, e viceversa. I profili che non
// dichiarano nulla restano sempre ammessi.
const intentConflict = (user: "serious" | "fun" | null, prof: ProfileIntent): boolean => {
  if (!user || !prof) return false;
  if (user === "fun" && prof === "serious") return true;
  if (user === "serious" && (prof === "casual" || prof === "open")) return true;
  return false;
};

export const DestinyGame = ({ currentUserId, onClose, onMatch }: DestinyGameProps) => {
  const { likedProfileIds } = useLikes();

  const [phase, setPhase] = useState<Phase>("intro");
  const [wantGender, setWantGender] = useState<string | null>(null);
  const [wantOrientation, setWantOrientation] = useState<string | null>(null);

  // Domande della sessione: si parte dalle 3 fisse; le 7 a tema vengono
  // aggiunte appena l'utente risponde a "Cosa cerchi davvero qui?" (cosi'
  // chi cerca divertimento riceve domande piccanti, chi cerca una storia
  // seria riceve domande romantiche).
  const [sessionQuestions, setSessionQuestions] = useState<DestinyQuestion[]>([...FIXED_QUESTIONS]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [pool, setPool] = useState<any[]>([]);     // profili compatibili rimanenti
  const [current, setCurrent] = useState<any | null>(null);

  // ── Carica + filtra i profili compatibili, poi mostra il primo ─────────────
  // Le risposte contano davvero: fascia d'età e "Cosa cerchi davvero qui?"
  // ordinano il mazzo, e i profili in contraddizione netta (es. tu cerchi
  // divertimento, l'altro dichiara una relazione seria) vengono ESCLUSI.
  const runSearch = useCallback(
    async (excludeId?: string, answersOverride?: Record<string, string>) => {
      setPhase("searching");
      const started = Date.now();
      const ans = answersOverride ?? answers;

      let working = pool;
      // prima ricerca: scarica e filtra
      if (working.length === 0 && !excludeId) {
        const { data } = await supabase
          .from("profiles")
          .select(
            "id, nickname, full_name, age, birthdate, gender, sexual_orientation, relationship_status, relationship_type, looking_for, city, avatar_url, bio, is_admin_profile"
          )
          .neq("id", currentUserId)
          .limit(400);

        const gOpt = GENDER_OPTIONS.find((o) => o.value === wantGender);
        const oOpt = ORIENTATION_OPTIONS.find((o) => o.value === wantOrientation);

        const base = (data || []).filter((p: any) => {
          const okG = !gOpt || matchesAlias(p.gender, gOpt);
          const okO = !oOpt || matchesAlias(p.sexual_orientation, oOpt);
          return okG && okO;
        });

        // 1) Contraddizioni di intento: mai nel mazzo.
        const uIntent = userIntentFromAnswer(ans["spicy_seek"]);
        const coherent = base.filter((p: any) => !intentConflict(uIntent, profileIntent(p)));

        // 2) Fascia d'età: prima i profili nella fascia richiesta, poi i
        //    vicini (entro 5 anni), poi gli altri. Cosi' il "Continua"
        //    degrada con grazia invece di pescare a caso.
        const band = AGE_BANDS[ans["age_band"] || ""];
        const ageOf = (p: any): number | null =>
          p.age ?? (p.birthdate ? calculateAge(p.birthdate) : null);
        const tier = (p: any): number => {
          if (!band) return 0;
          const a = ageOf(p);
          if (a == null) return 1; // età ignota: secondo piano, non escluso
          if (a >= band[0] && a <= band[1]) return 0;
          if (a >= band[0] - 5 && a <= band[1] + 5) return 1;
          return 2;
        };
        // 3) Dentro ogni fascia, prima chi dichiara un intento allineato al tuo.
        const intentRank = (p: any): number => {
          if (!uIntent) return 0;
          const pi = profileIntent(p);
          if (!pi) return 1;
          if (uIntent === "serious") return pi === "serious" ? 0 : 1;
          return pi === "casual" || pi === "open" ? 0 : 1;
        };

        working = shuffle(coherent).sort(
          (a: any, b: any) => tier(a) - tier(b) || intentRank(a) - intentRank(b)
        );
      }

      // escludi il profilo scartato/visto
      if (excludeId) working = working.filter((p) => p.id !== excludeId);

      // attesa "ricerca del destino" 7-8s (al netto del tempo già speso)
      const elapsed = Date.now() - started;
      const wait = Math.max(0, (7000 + Math.floor(Math.random() * 1500)) - elapsed);
      await new Promise((r) => setTimeout(r, wait));

      if (working.length === 0) {
        setPool([]);
        setCurrent(null);
        setPhase("empty");
        return;
      }

      const [next, ...rest] = working;
      setCurrent(next);
      setPool(rest);
      setPhase("result");
    },
    [pool, wantGender, wantOrientation, currentUserId, answers]
  );

  const handleAnswer = (qid: string, value: string) => {
    // Costruiamo subito l'oggetto completo: lo stato React non sarebbe ancora
    // aggiornato quando parte la ricerca sull'ultima risposta.
    const next = { ...answers, [qid]: value };
    setAnswers(next);

    // Risposta a "Cosa cerchi davvero qui?" → si compone il mazzo a tema
    // (piccante per divertimento, romantico per storia seria) e si prosegue.
    if (qid === "spicy_seek") {
      setSessionQuestions([...FIXED_QUESTIONS, ...buildThemedQuestions(value)]);
      setQIndex((i) => i + 1);
      return;
    }

    if (qIndex < sessionQuestions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      // ultima risposta data → avvia ricerca con TUTTE le risposte
      runSearch(undefined, next);
    }
  };

  const handleDiscard = () => {
    if (current) runSearch(current.id);
  };

  const canStart = wantGender && wantOrientation;
  const q = sessionQuestions[qIndex];

  const overlay = (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      {/* 🔧 nel Destino la foto della card (aspect-[3/4]) sarebbe troppo alta:
          la limitiamo a 300px (object-cover mantiene il viso visibile, non
          schiacciato) così il pannello resta compatto ma la foto si legge bene */}
      <style>{`.destiny-card-compact .aspect-\\[3\\/4\\]{aspect-ratio:auto!important;height:300px;}`}</style>
      <div className="relative w-full max-w-md my-4">
        {/* Chiudi */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-9 h-9 rounded-full bg-background/90 border border-pink-500/40 flex items-center justify-center hover:bg-background text-foreground/70 hover:text-foreground shadow-lg"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-purple-950/80 via-fuchsia-950/70 to-indigo-950/80 shadow-[0_8px_50px_-12px_rgba(244,114,182,0.5)] p-6 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
              <LoveCompassIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              Tenta il Destino
            </h2>
          </div>

          {/* ── STEP INTRO: genere + orientamento ── */}
          {phase === "intro" && (
            <div className="space-y-5">
              <p className="text-sm text-foreground/70">
                Lascia che il destino trovi la persona giusta per te. Prima, dicci chi cerchi:
              </p>

              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-pink-300/70 mb-2">Genere</p>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setWantGender(o.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        wantGender === o.value
                          ? "bg-fuchsia-500/30 border-fuchsia-400 text-white"
                          : "bg-white/[0.04] border-white/10 text-foreground/80 hover:bg-white/[0.08]"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-pink-300/70 mb-2">Orientamento</p>
                <div className="grid grid-cols-2 gap-2">
                  {ORIENTATION_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setWantOrientation(o.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        wantOrientation === o.value
                          ? "bg-indigo-500/30 border-indigo-400 text-white"
                          : "bg-white/[0.04] border-white/10 text-foreground/80 hover:bg-white/[0.08]"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                disabled={!canStart}
                onClick={() => setPhase("questions")}
                className="w-full h-11 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600 font-bold disabled:opacity-50"
              >
                Inizia <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP DOMANDE ── */}
          {phase === "questions" && q && (
            <div className="space-y-5">
              {/* progress (sempre su 10: il mazzo a tema si aggiunge in corsa) */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < qIndex ? "bg-fuchsia-400" : i === qIndex ? "bg-fuchsia-400/60" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <p className="text-lg font-bold text-foreground text-center min-h-[3rem] flex items-center justify-center">
                {q.text}
              </p>

              <div className={q.grid ? "grid grid-cols-3 gap-2" : "grid grid-cols-1 gap-2"}>
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(q.id, opt)}
                    className={`${
                      q.grid ? "py-2.5 text-xs" : "py-3 text-sm text-left px-4"
                    } rounded-xl font-semibold border bg-white/[0.04] border-white/10 text-foreground/90 hover:bg-fuchsia-500/20 hover:border-fuchsia-400/60 active:scale-[0.98] transition-all`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <p className="text-center text-[11px] text-foreground/40">
                Domanda {qIndex + 1} di {TOTAL_QUESTIONS}
              </p>
            </div>
          )}

          {/* ── STEP RICERCA ── */}
          {phase === "searching" && (
            <div className="py-10 flex flex-col items-center text-center gap-4">
              {/* logo del sito al centro, senza cerchio attorno */}
              <img
                src={loveableLogo}
                alt="LoveableConnect"
                className="w-24 h-24 object-contain animate-pulse drop-shadow-[0_2px_12px_rgba(244,114,182,0.55)]"
              />
              <div>
                <p className="text-lg font-black bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                  Il destino sta scegliendo…
                </p>
                <p className="text-sm text-foreground/50 mt-1">Stiamo cercando il profilo ideale per te</p>
              </div>
              <Loader2 className="w-5 h-5 text-fuchsia-300 animate-spin" />
            </div>
          )}

          {/* ── STEP RISULTATO ── */}
          {phase === "result" && current && (
            <div className="space-y-3">
              <p className="text-center text-sm font-semibold text-fuchsia-300">
                ✨ Il destino ha scelto per te ✨
              </p>
              {/* card compatta: limito l'altezza dell'immagine (aspect-[3/4] della
                  ProfileGridCard altrimenti la rende troppo alta nel pannello) */}
              <div className="destiny-card-compact">
                <ProfileGridCard
                  profile={current}
                  currentUserId={currentUserId}
                  likedProfileIds={likedProfileIds}
                  onLike={() => {}}
                  onMatch={onMatch}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="h-11 border-rose-400/40 text-rose-300 hover:bg-rose-500/15 font-semibold"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Esci
                </Button>
                <Button
                  onClick={handleDiscard}
                  className="h-11 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600 font-semibold"
                >
                  Continua
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP NESSUN RISULTATO ── */}
          {phase === "empty" && (
            <div className="py-8 text-center space-y-4">
              <p className="text-foreground/80">
                Il destino non ha trovato altre persone compatibili con questi criteri.
              </p>
              <Button onClick={onClose} variant="outline" className="border-pink-400/40">
                Chiudi
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
