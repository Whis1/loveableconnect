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
    const { userId, creditsAmount, amountPaid } = await req.json();

    if (!userId || !creditsAmount) {
      throw new Error("userId e creditsAmount sono obbligatori");
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

    // Get current balance
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();
    
    const newBalance = credits?.balance || 0;

    // Helper: replace {{placeholders}}
    const replaceVars = (text: string, vars: Record<string, string>) =>
      Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v ?? ''), text);

    // Try to load template from DB
    const { data: tmpl } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'purchase_credits')
      .maybeSingle();

    const variables = {
      creditsAmount: creditsAmount.toString(),
      amountPaid: amountPaid ? (amountPaid / 100).toFixed(2) : '0',
      newBalance: newBalance.toString(),
    } as Record<string, string>;

    const subject = tmpl ? replaceVars(tmpl.subject, variables) : "Grazie per il tuo acquisto! 🎉";
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
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Acquisto Completato!</h1>
              </div>
              <div style="padding:40px 30px;">
                <p>Hai acquistato <strong>${creditsAmount} crediti</strong> per €${(amountPaid / 100).toFixed(2)}.</p>
                <p>Il tuo nuovo saldo è <strong>${newBalance} crediti</strong>.</p>
              </div>
            </div>
          </body>
        </html>`;

    await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [user.email],
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Errore nell'invio dell'email di acquisto crediti:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
