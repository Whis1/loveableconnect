import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, subscriptionType, tier, expiresAt } = await req.json();

    if (!userId || !subscriptionType) {
      throw new Error("userId e subscriptionType sono obbligatori");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user email from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user?.email) {
      console.error("User not found or no email:", userError);
      return new Response(JSON.stringify({ success: false, error: "User not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    let planName = "Premium";
    let planEmoji = "✨";
    let benefits = "";
    
    if (subscriptionType === "monthly") {
      planName = tier === "gold" ? "Gold Mensile" : tier === "platinum" ? "Platinum Mensile" : "Premium Mensile";
      planEmoji = tier === "gold" ? "🥇" : tier === "platinum" ? "💎" : "✨";
      benefits = tier === "platinum" 
        ? "<li>✨ Chat illimitate</li><li>💬 Messaggi vocali</li><li>👁️ Vedi chi ti ha messo like</li><li>🔓 Like illimitati</li><li>🎮 Accesso a tutti i giochi</li><li>🏆 Doppi punti ELO</li>"
        : "<li>✨ Chat illimitate</li><li>💬 Messaggi vocali</li><li>👁️ Vedi chi ti ha messo like</li><li>🔓 Like illimitati</li>";
    } else if (subscriptionType === "yearly") {
      planName = tier === "gold" ? "Gold Annuale" : tier === "platinum" ? "Platinum Annuale" : "Premium Annuale";
      planEmoji = tier === "gold" ? "🥇" : tier === "platinum" ? "💎" : "✨";
      benefits = tier === "platinum"
        ? "<li>✨ Chat illimitate</li><li>💬 Messaggi vocali</li><li>👁️ Vedi chi ti ha messo like</li><li>🔓 Like illimitati</li><li>🎮 Accesso a tutti i giochi</li><li>🏆 Doppi punti ELO</li><li>💰 Risparmio del 20%</li>"
        : "<li>✨ Chat illimitate</li><li>💬 Messaggi vocali</li><li>👁️ Vedi chi ti ha messo like</li><li>🔓 Like illimitati</li><li>💰 Risparmio del 20%</li>";
    }

    const formattedDate = expiresAt ? new Date(expiresAt).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : '';

    // Helper: replace {{placeholders}}
    const replaceVars = (text: string, vars: Record<string, string>) =>
      Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v ?? ''), text);

    // Try to load template from DB
    const { data: tmpl } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'subscription_purchased')
      .maybeSingle();

    const variables = {
      subscriptionType: planName,
      tier: tier || '',
      expiresAt: formattedDate,
      benefits,
    } as Record<string, string>;

    const subject = tmpl ? replaceVars(tmpl.subject, variables) : "Benvenuto in Premium! 🌟";
    const html = tmpl ? replaceVars(tmpl.html_content, variables) : `
        <!DOCTYPE html>
        <html lang="it">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Benvenuto in Premium! ${planEmoji}</h1>
              </div>
              <div style="padding:40px 30px;">
                <p>Il tuo abbonamento <strong>${planName}</strong> è ora attivo!</p>
                ${formattedDate ? `<p>Scadenza: <strong>${formattedDate}</strong></p>` : ''}
                <h2 style="color:#ec4899; margin-top:30px;">I tuoi vantaggi:</h2>
                <ul style="color:#666;">
                  ${benefits}
                </ul>
                <p style="margin-top:30px;">Inizia subito a goderti tutti i vantaggi premium! ✨</p>
              </div>
            </div>
          </body>
        </html>`;

    await resend.emails.send({
      from: "LoveableConnect 💕 <onboarding@resend.dev>",
      to: [user.email],
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Errore nell'invio dell'email di abbonamento acquistato:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
