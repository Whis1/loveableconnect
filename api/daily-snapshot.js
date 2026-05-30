// 🕛 CRON GIORNALIERO — snapshot classifica + assegnazione "campione del giorno".
//
// Gira sui server Vercel ogni notte (vedi "crons" in vercel.json), TOTALMENTE
// indipendente dal traffico del sito: anche se non entra nessuno per mesi, lo
// snapshot viene comunque scattato. Chiama la RPC `award_daily_top1_if_needed`,
// che è idempotente (PRIMARY KEY su daily_top1_trophies.award_date) e recupera
// tutti i giorni arretrati fino a ieri.
//
// Usa le env già presenti su Vercel (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).
// Opzionale: se CRON_SECRET è impostato, l'endpoint accetta solo chiamate con
// header "Authorization: Bearer <CRON_SECRET>" (Vercel lo invia in automatico).

// Fallback pubblici: l'URL e la chiave anon NON sono segreti (sono già nel
// bundle JS del sito). Servono perché le env VITE_* non sempre arrivano alle
// serverless function di Vercel a runtime. La RPC è SECURITY DEFINER, quindi
// la chiave anon è sufficiente. Se imposti env su Vercel, hanno la precedenza.
const FALLBACK_URL = "https://tcmhvrlsaggyuukdscue.supabase.co";
const FALLBACK_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbWh2cmxzYWdneXV1a2RzY3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODIyNjcsImV4cCI6MjA3NTg1ODI2N30.emqOEktx6ELOiCP5KMPCK3cBmE5-voWBe8ybwkX3vzw";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  FALLBACK_ANON;

export default async function handler(req, res) {
  // 🔒 Se è impostato CRON_SECRET, verifica l'header (Vercel lo invia da solo).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ error: "Supabase env vars missing" });
    return;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/award_daily_top1_if_needed`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      }
    );

    const text = await response.text();
    if (!response.ok) {
      console.error("daily-snapshot RPC failed:", response.status, text);
      res.status(502).json({ ok: false, status: response.status, body: text });
      return;
    }

    console.log("daily-snapshot OK:", text);
    res.status(200).json({ ok: true, result: text });
  } catch (error) {
    console.error("daily-snapshot error:", error);
    res.status(500).json({ ok: false, error: String(error) });
  }
}
