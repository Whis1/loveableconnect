// 🎁 Catalogo dei regali in chat. I costi sono in CREDITI REGALO (saldo
// separato, acquistabile solo in euro): il ricevente incassa l'equivalente
// del costo in crediti normali. Il catalogo DEVE restare allineato alla
// funzione SQL send_chat_gift (stessi id e costi).

export interface ChatGift {
  id: string;
  emoji: string;
  name: string;
  description: string;
  cost: number; // crediti regalo
}

export const CHAT_GIFTS: ChatGift[] = [
  { id: "rosa", emoji: "🌹", name: "Rosa", description: "Un classico che non sbaglia mai", cost: 2 },
  { id: "bacio", emoji: "💋", name: "Bacio", description: "Dolce, diretto, inequivocabile", cost: 3 },
  { id: "colomba", emoji: "🕊️", name: "Colomba", description: "Pace, dolcezza e buone intenzioni", cost: 4 },
  { id: "cuore", emoji: "❤️", name: "Cuore", description: "Quando le parole non bastano", cost: 6 },
  { id: "frusta", emoji: "⛓️", name: "Frusta", description: "Per chi ha capito il gioco", cost: 8 },
  { id: "champagne", emoji: "🍾", name: "Champagne", description: "C'è qualcosa da festeggiare", cost: 10 },
  { id: "diamante", emoji: "💎", name: "Diamante", description: "Un gesto che brilla davvero", cost: 20 },
  { id: "corvo", emoji: "🐦‍⬛", name: "Corvo Nero", description: "Il regalo leggendario, per pochi", cost: 50 },
];

export const getChatGift = (id: string): ChatGift | undefined =>
  CHAT_GIFTS.find((g) => g.id === id);

// I regali viaggiano come messaggi normali con contenuto "[gift:<id>]".
const GIFT_RE = /^\[gift:([a-z_]+)\]$/;
export const parseGiftMessage = (content: string | null | undefined): ChatGift | null => {
  if (!content) return null;
  const m = content.match(GIFT_RE);
  if (!m) return null;
  return getChatGift(m[1]) ?? null;
};

// 💶 Pacchetti di crediti regalo (acquisto in euro via Stripe).
export const GIFT_PACKS = [
  { id: "small", credits: 25, priceLabel: "4,99 €" },
  { id: "big", credits: 100, priceLabel: "19,99 €" },
] as const;
