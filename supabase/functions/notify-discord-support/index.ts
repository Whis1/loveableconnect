import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// 🔔 Notifiche Discord per LoveableConnect.
//
// Gestisce due tipi di evento (campo "type" nel body):
//   - "support" (default): nuovo messaggio al supporto clienti
//   - "signup": nuova registrazione utente (email o Google)
//
// Manda un messaggio al canale Discord via WEBHOOK, taggando l'admin.
// Dati sensibili nei Secret di Lovable Cloud (NON nel frontend):
//   - DISCORD_SUPPORT_WEBHOOK_URL : URL del webhook del canale Discord
//   - DISCORD_ADMIN_USER_ID       : il tuo User ID Discord (per il tag <@id>)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  type?: "support" | "signup";
  userEmail?: string;
  message?: string;
  nickname?: string;
  provider?: string; // es. "google" | "email"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("DISCORD_SUPPORT_WEBHOOK_URL");
    const adminUserId = Deno.env.get("DISCORD_ADMIN_USER_ID");

    if (!webhookUrl) {
      return new Response(JSON.stringify({ skipped: "no webhook configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: NotifyRequest = await req.json().catch(() => ({}));
    const type = payload.type === "signup" ? "signup" : "support";
    const mention = adminUserId ? `<@${adminUserId}> ` : "";
    const safeEmail = (payload.userEmail || "sconosciuto").slice(0, 200);

    let body: Record<string, unknown>;

    if (type === "signup") {
      // 🎉 Nuova registrazione
      const nickname = (payload.nickname || "—").slice(0, 100);
      const provider = (payload.provider || "email").slice(0, 50);
      body = {
        content: `${mention}🎉 **Nuova registrazione su LoveableConnect!**`,
        embeds: [
          {
            title: "Nuovo utente registrato",
            color: 0x9333ea, // viola
            fields: [
              { name: "Nickname", value: nickname, inline: true },
              { name: "Metodo", value: provider === "google" ? "Google" : "Email", inline: true },
              { name: "Email", value: safeEmail, inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: "LoveableConnect • Registrazioni" },
          },
        ],
        allowed_mentions: adminUserId ? { users: [adminUserId] } : { parse: [] },
      };
    } else {
      // 🆘 Messaggio di supporto
      const safeMessage = (payload.message || "(nessun testo)").slice(0, 1500);
      body = {
        content: `${mention}🆘 **Nuovo messaggio supporto clienti**`,
        embeds: [
          {
            title: "Richiesta di supporto",
            color: 0xec4899, // rosa
            fields: [
              { name: "Utente", value: safeEmail, inline: false },
              { name: "Messaggio", value: safeMessage, inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: "LoveableConnect • Supporto" },
          },
        ],
        allowed_mentions: adminUserId ? { users: [adminUserId] } : { parse: [] },
      };
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Discord webhook error:", res.status, txt);
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
    return new Response(JSON.stringify({ ok: false, error: error?.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
