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
    const { userId, subscriptionType, daysRemaining, expiresAt } = await req.json();

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

    const planName = subscriptionType === 'weekly' ? 'Premium Settimanale' : 'Premium Mensile';
    const expiryDate = new Date(expiresAt).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [user.email],
      subject: `⏰ Il tuo abbonamento ${planName} scade tra ${daysRemaining} giorni`,
      html: `
        <!DOCTYPE html>
        <html lang="it">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
              
              <!-- HEADER -->
              <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
                <img src="https://tcmhvrlsaggyuukdscue.supabase.co/storage/v1/object/public/images/loveable-logo.png" alt="LoveableConnect" style="width:120px; height:120px; margin-bottom:20px; border-radius:50%; border:4px solid rgba(255,255,255,0.3); box-shadow:0 8px 32px rgba(0,0,0,0.2);" />
                <div style="font-size:60px; margin-bottom:10px;">⏰</div>
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Abbonamento in Scadenza</h1>
                <p style="color:rgba(255,255,255,0.95); font-size:16px; margin-top:10px;">Il tuo Premium sta per terminare</p>
              </div>
              
              <!-- BODY -->
              <div style="padding:40px 30px;">
                <h2 style="color:#9333ea; font-size:24px; margin-bottom:15px; font-weight:700;">Ciao! 👋</h2>
                <p style="color:#374151; font-size:16px; line-height:1.6;">
                  Volevamo ricordarti che il tuo abbonamento <strong style="color:#ec4899;">${planName}</strong> scadrà tra <strong style="color:#ef4444;">${daysRemaining} giorni</strong>.
                </p>
                
                <p style="color:#374151; font-size:16px; line-height:1.6; margin-top:20px;">
                  Data di scadenza: <strong>${expiryDate}</strong>
                </p>
                
                <!-- URGENCY BOX -->
                <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5); padding:20px; border-radius:12px; margin:25px 0; border-left:5px solid #f97316; text-align:center;">
                  <p style="margin:0; color:#92400e; font-size:16px; line-height:1.6;">
                    <strong>🔥 Non perdere l'accesso alle funzionalità Premium!</strong><br/>
                    <span style="font-size:14px;">Rinnova ora e continua a goderti tutti i vantaggi!</span>
                  </p>
                </div>
                
                <!-- BUTTON -->
                <div style="text-align:center; margin:35px 0;">
                  <a href="${supabaseUrl.replace('.supabase.co', '')}/credits" 
                     style="display:inline-block;
                            background:linear-gradient(135deg,#ec4899,#9333ea);
                            color:white;
                            padding:18px 45px;
                            border-radius:16px;
                            font-weight:700;
                            text-decoration:none;
                            font-size:18px;
                            box-shadow:0 8px 30px rgba(147,51,234,0.4);
                            border:2px solid rgba(255,255,255,0.2);">
                    💎 Rinnova Adesso
                  </a>
                </div>
                
                <!-- BENEFITS -->
                <div style="background:linear-gradient(135deg,#f3e8ff,#fce7f3); padding:25px; border-radius:16px; margin-top:30px; border:2px solid rgba(236,72,153,0.1);">
                  <h3 style="color:#9333ea; margin-bottom:15px; font-size:18px; font-weight:700;">✨ Cosa perderai senza Premium:</h3>
                  <ul style="color:#4b5563; font-size:14px; line-height:2; margin:0; padding-left:0; list-style:none;">
                    <li>💬 <strong>Messaggi illimitati</strong> con tutti i tuoi match</li>
                    <li>👁️ <strong>Visualizza chi ti ha messo like</strong> prima di ricambiare</li>
                    <li>🎯 <strong>Filtri di ricerca avanzati</strong> per trovare la persona perfetta</li>
                    <li>✨ <strong>Maggiore visibilità</strong> nei risultati di ricerca</li>
                    <li>🎮 <strong>Accesso completo</strong> a tutti i giochi e funzioni</li>
                  </ul>
                </div>
                
                <!-- REASSURANCE -->
                <div style="background:#f9fafb; padding:20px; border-radius:12px; margin-top:25px; border:1px solid #e5e7eb;">
                  <p style="margin:0; color:#6b7280; font-size:14px; line-height:1.6; text-align:center;">
                    💡 <strong>Rinnova ora</strong> e continua senza interruzioni la tua esperienza premium su LoveableConnect!
                  </p>
                </div>
              </div>
              
              <!-- FOOTER -->
              <div style="background:linear-gradient(135deg,#fafafa,#f3f4f6); padding:25px; text-align:center; border-top:2px solid #e5e7eb;">
                <p style="color:#6b7280; font-size:14px; margin:5px 0; font-weight:600;">💕 LoveableConnect</p>
                <p style="color:#9ca3af; font-size:12px; margin:5px 0;">Dove nascono legami autentici</p>
                <p style="color:#9ca3af; font-size:12px; margin-top:15px;">Hai domande? Contatta il nostro supporto!</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Errore nell'invio dell'email di scadenza abbonamento:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
