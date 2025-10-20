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
            from: "Love App <onboarding@resend.dev>",
            to: [user.email],
            subject: "⚠️ Il tuo abbonamento Premium sta per scadere",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #f59e0b;">⚠️ Abbonamento in Scadenza</h1>
                <p>Ciao,</p>
                <p>Il tuo abbonamento Premium scadrà tra ${daysLeft} ${daysLeft === 1 ? 'giorno' : 'giorni'}!</p>
                
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0; color: #92400e;">Dettagli Abbonamento</h2>
                  <p><strong>Data di Scadenza:</strong> ${expiryDate.toLocaleDateString('it-IT')}</p>
                  <p><strong>Tempo Rimanente:</strong> ${daysLeft} ${daysLeft === 1 ? 'giorno' : 'giorni'}</p>
                </div>

                <div style="background: #fce7f3; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #9f1239;">
                    💡 Dopo la scadenza, tornerai al piano gratuito con crediti limitati giornalieri.
                  </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}/credits" 
                     style="background: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Rinnova Ora
                  </a>
                </div>

                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                  Se hai già rinnovato, ignora questa email.
                </p>
              </div>
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
            from: "Love App <onboarding@resend.dev>",
            to: [user.email],
            subject: "💔 Il tuo abbonamento Premium è scaduto",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dc2626;">💔 Abbonamento Scaduto</h1>
                <p>Ciao,</p>
                <p>Il tuo abbonamento Premium è scaduto il ${expiryDate.toLocaleDateString('it-IT')}.</p>
                
                <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0; color: #991b1b;">Cosa è cambiato</h2>
                  <ul style="color: #7f1d1d;">
                    <li>Sei tornato al piano gratuito</li>
                    <li>40 crediti gratuiti ogni 24 ore</li>
                    <li>Accesso limitato ai likes ricevuti</li>
                    <li>Nessuna priorità nella visualizzazione</li>
                  </ul>
                </div>

                <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #1e40af;">
                    💡 Puoi riattivare Premium in qualsiasi momento per ritornare ai vantaggi illimitati!
                  </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}/credits" 
                     style="background: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Riattiva Premium
                  </a>
                </div>

                <p>Grazie per essere stato un membro Premium!</p>
              </div>
            `,
          });
          console.log(`Expiry notification sent to ${user.email}`);
        } catch (emailError) {
          console.error(`Error sending expiry notification to ${user.email}:`, emailError);
        }

        // Update user to non-premium
        await supabaseClient
          .from("user_credits")
          .update({
            is_premium: false,
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
