import { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProfileGridCard } from "@/components/ProfileGridCard";
import { useLikes } from "@/hooks/useLikes";
import { X, ArrowRight, Loader2, LogOut } from "lucide-react";
import { LoveCompassIcon } from "@/lib/championIcons";

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
];

// ── Pool di domande RANDOM (scenografiche, pescate a caso ogni volta) ────────
const QUESTION_POOL: DestinyQuestion[] = [
  { id: "evening", text: "La serata ideale?", options: ["Cena a lume di candela", "Serata tra amici", "Film e coccole sul divano", "Avventura all'ultimo minuto"] },
  { id: "travel", text: "La vacanza dei sogni?", options: ["Spiaggia e relax", "Città d'arte", "Montagna e natura", "Viaggio zaino in spalla"] },
  { id: "music", text: "La colonna sonora della tua vita?", options: ["Pop", "Rock", "Indie", "Musica classica", "Hip-hop / Rap"] },
  { id: "love_lang", text: "Come dimostri affetto?", options: ["Con le parole", "Con i gesti", "Con il tempo insieme", "Con i regali"] },
  { id: "if_fight", text: "E se litigaste in coppia, cosa faresti?", options: ["Ne parlo subito", "Mi prendo un momento", "Cerco un compromesso", "Sdrammatizzo con ironia"] },
  { id: "if_surprise", text: "Il/la partner ti organizza una sorpresa: tu...", options: ["Adoro le sorprese!", "Mi imbarazzo un po'", "Preferisco saperlo prima", "Ricambio subito"] },
  { id: "weekend", text: "Il weekend perfetto?", options: ["Fuori a esplorare", "A casa in pieno relax", "Sport e attività", "Cultura: mostre, libri, teatro"] },
  { id: "cook", text: "In cucina sei...", options: ["Uno chef provetto", "Cavo solo l'essenziale", "Disastro totale (ordino)", "Adoro provare ricette nuove"] },
  { id: "morning", text: "Mattiniero o nottambulo?", options: ["Sveglia all'alba", "Il mio momento è la sera", "Dipende dai giorni", "Dormo appena posso"] },
  { id: "pet", text: "Animali?", options: ["Amo i cani", "Team gatti", "Tutti gli animali!", "Meglio senza"] },
  { id: "ideal_date", text: "Il primo appuntamento ideale?", options: ["Aperitivo informale", "Passeggiata e chiacchiere", "Qualcosa di originale", "Cena elegante"] },
  { id: "future", text: "Come ti vedi tra 5 anni?", options: ["In una relazione stabile", "A viaggiare per il mondo", "Realizzato nel lavoro", "Vivo alla giornata"] },
  { id: "if_far", text: "E se l'anima gemella vivesse lontano?", options: ["La distanza non è un problema", "Ci proverei volentieri", "Preferisco vicinanza", "Dipende dal feeling"] },
  { id: "social", text: "Quanto sei social?", options: ["Sempre in mezzo alla gente", "Pochi ma buoni", "Dipende dall'umore", "Più tipo casa e relax"] },
  { id: "spontaneity", text: "Cosa ti attrae di più?", options: ["L'intelligenza", "Il senso dell'umorismo", "La gentilezza", "L'aspetto e lo stile"] },
  { id: "if_gift", text: "Il regalo che vorresti ricevere?", options: ["Qualcosa di fatto a mano", "Un'esperienza insieme", "Una sorpresa romantica", "Qualcosa di utile"] },
  { id: "season", text: "La tua stagione del cuore?", options: ["Primavera", "Estate", "Autunno", "Inverno"] },
  { id: "risk", text: "Quanto sei avventuroso/a?", options: ["Vivo per il brivido", "Mi piace un rischio calcolato", "Meglio la sicurezza", "Dipende"] },
  // 🔥 domande piccanti / intime
  { id: "spicy_seek", text: "Cosa cerchi davvero qui?", options: ["L'amore della vita", "Una storia seria", "Avventure leggere", "Solo divertimento 🔥"] },
  { id: "spicy_first", text: "Al primo appuntamento, un bacio...", options: ["Solo se scatta la scintilla", "Assolutamente sì", "Meglio aspettare", "Chi lo sa… 😏"] },
  { id: "spicy_temp", text: "Come ti descriveresti?", options: ["Romantico/a inguaribile", "Passionale e intenso/a", "Giocoso/a e malizioso/a", "Un mistero da scoprire"] },
  { id: "spicy_msg", text: "Ricevi un messaggio audace a tarda notte. Tu...", options: ["Sorrido e rispondo subito", "Mi incuriosisco", "Dipende da chi lo manda", "Preferisco le cose lente"] },
  { id: "spicy_dream", text: "Il tuo lato segreto è più...", options: ["Tenero e coccoloso", "Audace e intraprendente", "Timido ma curioso", "Esplosivo 🔥"] },
];

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

export const DestinyGame = ({ currentUserId, onClose, onMatch }: DestinyGameProps) => {
  const { likedProfileIds } = useLikes();

  const [phase, setPhase] = useState<Phase>("intro");
  const [wantGender, setWantGender] = useState<string | null>(null);
  const [wantOrientation, setWantOrientation] = useState<string | null>(null);

  // domande di questa sessione (fisse + random) generate una volta
  const sessionQuestions = useMemo<DestinyQuestion[]>(
    () => [...FIXED_QUESTIONS, ...shuffle(QUESTION_POOL).slice(0, 6)],
    []
  );
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [pool, setPool] = useState<any[]>([]);     // profili compatibili rimanenti
  const [current, setCurrent] = useState<any | null>(null);

  // ── Carica + filtra i profili compatibili, poi mostra il primo ─────────────
  const runSearch = useCallback(
    async (excludeId?: string) => {
      setPhase("searching");
      const started = Date.now();

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

        working = (data || []).filter((p: any) => {
          const okG = !gOpt || matchesAlias(p.gender, gOpt);
          const okO = !oOpt || matchesAlias(p.sexual_orientation, oOpt);
          return okG && okO;
        });
        working = shuffle(working);
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
    [pool, wantGender, wantOrientation, currentUserId]
  );

  const handleAnswer = (qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    if (qIndex < sessionQuestions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      // ultima risposta data → avvia ricerca
      runSearch();
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
              {/* progress */}
              <div className="flex items-center gap-1.5">
                {sessionQuestions.map((_, i) => (
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
                Domanda {qIndex + 1} di {sessionQuestions.length}
              </p>
            </div>
          )}

          {/* ── STEP RICERCA ── */}
          {phase === "searching" && (
            <div className="py-10 flex flex-col items-center text-center gap-4">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-fuchsia-500/30 blur-2xl animate-pulse" />
                <LoveCompassIcon className="relative w-20 h-20 animate-pulse drop-shadow-[0_2px_8px_rgba(244,114,182,0.5)]" />
              </div>
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
