import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const now = new Date();
    
    // Find subscriptions expiring in 3 days
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const { data: expiringUsers, error: expiringError } = await supabaseClient
      .from("user_credits")
      .select("user_id, premium_expires_at")
      .eq("is_premium", true)
      .gte("premium_expires_at", now.toISOString())
      .lte("premium_expires_at", threeDaysFromNow.toISOString());

    if (expiringError) {
      console.error("Error fetching expiring subscriptions:", expiringError);
    }

    // Send warning emails
    if (expiringUsers && expiringUsers.length > 0) {
      console.log(`Found ${expiringUsers.length} subscriptions expiring soon`);
      
      for (const userCredit of expiringUsers) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("id", userCredit.user_id)
          .single();

        if (!profile) continue;

        const { data: { user } } = await supabaseClient.auth.admin.getUserById(userCredit.user_id);
        
        if (!user?.email) continue;

        const expiryDate = new Date(userCredit.premium_expires_at);
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        try {
          await resend.emails.send({
            from: "LoveableConnect <noreply@loveableconnect.com>",
            to: [user.email],
            subject: "⚠️ Il tuo Premium sta per scadere - LoveableConnect",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(245, 158, 11, 0.2);">
                  
                  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 10px;">⏰</div>
                    <h1 style="color: white; font-size: 26px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Abbonamento in Scadenza</h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Attenzione! Il tuo Premium sta per scadere</p>
                  </div>

                  <div style="padding: 40px 30px;">
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                      ⚠️ Ciao! Ti informiamo che il tuo abbonamento Premium scadrà tra <strong style="color: #f59e0b;">${daysLeft} ${daysLeft === 1 ? 'giorno' : 'giorni'}</strong>.
                    </p>

                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                      <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">📋 Dettagli Abbonamento</h3>
                      <div style="color: #78350f; font-size: 15px; line-height: 1.8;">
                        <p style="margin: 8px 0;"><strong>Data di Scadenza:</strong> ${expiryDate.toLocaleDateString('it-IT')}</p>
                        <p style="margin: 8px 0;"><strong>Tempo Rimanente:</strong> <span style="font-size: 20px; color: #f59e0b; font-weight: 700;">${daysLeft}</span> ${daysLeft === 1 ? 'giorno' : 'giorni'}</p>
                      </div>
                    </div>

                    <div style="background: #fee2e2; padding: 20px; border-radius: 12px; margin: 25px 0;">
                      <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 15px; font-weight: 600;">
                        ⚡ Dopo la scadenza:
                      </p>
                      <ul style="color: #7f1d1d; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>Tornerai al piano gratuito</li>
                        <li>26 crediti gratuiti ogni 24 ore</li>
                        <li>Accesso limitato ai likes ricevuti</li>
                        <li>Nessuna priorità nella visualizzazione</li>
                      </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}/credits" 
                         style="background: linear-gradient(135deg, #ec4899 0%, #9333ea 100%); 
                                color: white; 
                                padding: 16px 40px; 
                                text-decoration: none; 
                                border-radius: 12px; 
                                display: inline-block;
                                font-weight: 700;
                                font-size: 16px;
                                box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                        👑 Rinnova Ora
                      </a>
                    </div>

                    <div style="background: #dbeafe; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
                      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                        💡 Il rinnovo è veloce e i tuoi vantaggi Premium continuano senza interruzioni!
                      </p>
                    </div>

                    <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 25px 0 0 0; text-align: center; font-style: italic;">
                      Se hai già rinnovato, ignora questa email.
                    </p>
                  </div>

                  <div style="background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      💕 <strong style="color: #ec4899;">LoveableConnect</strong> - Connessioni autentiche, storie vere
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
          console.log(`Expiry warning sent to ${user.email}`);
        } catch (emailError) {
          console.error(`Error sending expiry warning to ${user.email}:`, emailError);
        }
      }
    }

    // Find expired subscriptions (expired in last 24 hours)
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: expiredUsers, error: expiredError } = await supabaseClient
      .from("user_credits")
      .select("user_id, premium_expires_at, is_premium")
      .eq("is_premium", true)
      .lt("premium_expires_at", now.toISOString())
      .gte("premium_expires_at", oneDayAgo.toISOString());

    if (expiredError) {
      console.error("Error fetching expired subscriptions:", expiredError);
    }

    // Send expired notification and update status
    if (expiredUsers && expiredUsers.length > 0) {
      console.log(`Found ${expiredUsers.length} expired subscriptions`);
      
      for (const userCredit of expiredUsers) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("id", userCredit.user_id)
          .single();

        if (!profile) continue;

        const { data: { user } } = await supabaseClient.auth.admin.getUserById(userCredit.user_id);
        
        if (!user?.email) continue;

        const expiryDate = new Date(userCredit.premium_expires_at);

        try {
          await resend.emails.send({
            from: "LoveableConnect <noreply@loveableconnect.com>",
            to: [user.email],
            subject: "💔 Il tuo Premium è scaduto - LoveableConnect",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);">
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(220, 38, 38, 0.15);">
                  
                  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 20px; text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 10px;">💔</div>
                    <h1 style="color: white; font-size: 26px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Abbonamento Scaduto</h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Ci mancherai come Premium!</p>
                  </div>

                  <div style="padding: 40px 30px;">
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                      Ciao! Il tuo abbonamento Premium è scaduto il <strong style="color: #dc2626;">${expiryDate.toLocaleDateString('it-IT')}</strong>.
                    </p>

                    <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #dc2626;">
                      <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">🔄 Cosa è cambiato</h3>
                      <ul style="color: #7f1d1d; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Sei tornato al piano gratuito</li>
                        <li style="margin-bottom: 8px;">26 crediti gratuiti ogni 24 ore</li>
                        <li style="margin-bottom: 8px;">Accesso limitato ai likes ricevuti</li>
                        <li style="margin-bottom: 8px;">Nessuna priorità nella visualizzazione</li>
                        <li>Badge Premium rimosso dal profilo</li>
                      </ul>
                    </div>

                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 10px;">✨</div>
                      <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600; line-height: 1.6;">
                        Ma non preoccuparti!
                      </p>
                      <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                        Puoi comunque continuare a usare LoveableConnect con il piano gratuito. Ogni giorno riceverai 26 crediti che si ricaricano automaticamente!
                      </p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}/credits" 
                         style="background: linear-gradient(135deg, #ec4899 0%, #9333ea 100%); 
                                color: white; 
                                padding: 16px 40px; 
                                text-decoration: none; 
                                border-radius: 12px; 
                                display: inline-block;
                                font-weight: 700;
                                font-size: 16px;
                                box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                        👑 Riattiva Premium
                      </a>
                    </div>

                    <div style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); padding: 25px; border-radius: 12px; margin: 25px 0;">
                      <h3 style="color: #6b21a8; margin: 0 0 15px 0; font-size: 17px; font-weight: 600; text-align: center;">
                        💜 Cosa ti sei perso come Premium
                      </h3>
                      <div style="color: #6b21a8; font-size: 14px; line-height: 1.8;">
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                          <span style="font-size: 20px; margin-right: 10px;">💬</span>
                          <span>Crediti illimitati per messaggi</span>
                        </div>
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                          <span style="font-size: 20px; margin-right: 10px;">❤️</span>
                          <span>Accesso completo ai likes ricevuti</span>
                        </div>
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                          <span style="font-size: 20px; margin-right: 10px;">⭐</span>
                          <span>Priorità nella visualizzazione</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                          <span style="font-size: 20px; margin-right: 10px;">👑</span>
                          <span>Badge Premium esclusivo</span>
                        </div>
                      </div>
                    </div>

                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
                      Grazie per essere stato parte della famiglia Premium! 💖
                    </p>
                  </div>

                  <div style="background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      💕 <strong style="color: #ec4899;">LoveableConnect</strong> - Connessioni autentiche, storie vere
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
          console.log(`Expiry notification sent to ${user.email}`);
        } catch (emailError) {
          console.error(`Error sending expiry notification to ${user.email}:`, emailError);
        }

        // Update user to non-premium and reset to free tier values
        await supabaseClient
          .from("user_credits")
          .update({
            is_premium: false,
            subscription_type: 'none',
            balance: 16,
            daily_likes_remaining: 8,
            daily_free_chats_remaining: 0,
            daily_likes_reset_at: null,
            daily_free_chats_reset_at: null,
            credits_depleted_at: null,
            updated_at: now.toISOString(),
          })
          .eq("user_id", userCredit.user_id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        expiring_notified: expiringUsers?.length || 0,
        expired_notified: expiredUsers?.length || 0 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in check-subscription-expiry:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
