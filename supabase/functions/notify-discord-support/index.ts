import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// 🔔 Notifica Discord per nuovi messaggi al supporto clienti.
//
// Il frontend chiama questa funzione quando un utente apre una NUOVA
// conversazione di supporto. La funzione manda un messaggio al canale Discord
// tramite WEBHOOK, taggando l'admin.
//
// I dati sensibili stanno nei Secret di Lovable Cloud (NON nel codice frontend,
// così il webhook non è visibile/abusabile dagli utenti):
//   - DISCORD_SUPPORT_WEBHOOK_URL : URL del webhook del canale Discord
//   - DISCORD_ADMIN_USER_ID       : il tuo User ID Discord (per il tag <@id>)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  userEmail?: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("DISCORD_SUPPORT_WEBHOOK_URL");
    const adminUserId = Deno.env.get("DISCORD_ADMIN_USER_ID");

    // Se il webhook non è configurato, non è un errore: semplicemente non
    // notifichiamo (così il supporto continua a funzionare comunque).
    if (!webhookUrl) {
      return new Response(JSON.stringify({ skipped: "no webhook configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userEmail, message }: NotifyRequest = await req.json().catch(() => ({}));

    // Tag che ti menziona (se hai messo l'ID). Senza ID, niente tag ma messaggio sì.
    const mention = adminUserId ? `<@${adminUserId}> ` : "";

    // Tronca il testo del messaggio per non superare i limiti di Discord.
    const safeMessage = (message || "(nessun testo)").slice(0, 1500);
    const safeEmail = (userEmail || "utente sconosciuto").slice(0, 200);

    // Messaggio con "embed" carino (titolo + campi).
    const body = {
      content: `${mention}🆘 **Nuovo messaggio supporto clienti**`,
      embeds: [
        {
          title: "Richiesta di supporto",
          color: 0xec4899, // rosa LoveableConnect
          fields: [
            { name: "Utente", value: safeEmail, inline: false },
            { name: "Messaggio", value: safeMessage, inline: false },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "LoveableConnect • Supporto" },
        },
      ],
      // allowed_mentions: permette esplicitamente di taggare l'utente indicato.
      allowed_mentions: adminUserId ? { users: [adminUserId] } : { parse: [] },
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Discord webhook error:", res.status, txt);
      // Non blocchiamo il supporto: ritorniamo 200 con nota.
      return new Response(JSON.stringify({ ok: false, status: res.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("notify-discord-support error:", error);
    // Anche in caso di errore, 200: la notifica è "best effort", non deve mai
    // far fallire l'invio del messaggio di supporto lato utente.
    return new Response(JSON.stringify({ ok: false, error: error?.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
