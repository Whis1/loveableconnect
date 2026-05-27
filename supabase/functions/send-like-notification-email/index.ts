import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getDisplayName, replaceTemplateVars, userTemplateVars } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, likerNickname } = await req.json();

    if (!userId || !likerNickname) {
      throw new Error("userId e likerNickname sono obbligatori");
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

    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('nickname, full_name')
      .eq('id', userId)
      .maybeSingle();

    const recipientName = getDisplayName(recipientProfile, user);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Try to load template from DB
    const { data: tmpl } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'like_notification')
      .maybeSingle();

    const variables = {
      ...userTemplateVars(recipientName, ['recipient', 'receiver']),
      likerNickname,
      likerName: likerNickname,
      senderNickname: likerNickname,
      senderName: likerNickname,
    };

    const subject = tmpl ? replaceTemplateVars(tmpl.subject, variables) : "❤️ Qualcuno ha messo like al tuo profilo!";
    const html = tmpl ? replaceTemplateVars(tmpl.html_content, variables) : `
        <!DOCTYPE html>
        <html lang="it">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Hai ricevuto un Like!</h1>
              </div>
              <div style="padding:40px 30px;">
                <p><strong>${likerNickname}</strong> ha messo like al tuo profilo.</p>
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
    console.error("Errore nell'invio dell'email di notifica like:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
