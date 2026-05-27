import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getDisplayName, replaceTemplateVars, userTemplateVars } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendConfirmationRequest {
  email: string;
  redirect_to?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirect_to }: ResendConfirmationRequest = await req.json();

    if (!email) {
      throw new Error("Email è obbligatoria");
    }

    console.log(`Resending confirmation email to: ${email}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error("Error listing users:", listError);
      throw new Error("Errore nella verifica dell'utente");
    }

    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!existingUser) {
      // Don't reveal if user exists or not for security
      return new Response(JSON.stringify({ success: true, message: "Se l'email è registrata, riceverai un'email di conferma" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if email is already confirmed
    if (existingUser.email_confirmed_at) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "L'email è già stata confermata. Puoi accedere normalmente." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Generate new confirmation link using magiclink type (confirms email on click)
    const redirectTo = redirect_to || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/`;
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectTo,
      }
    });

    if (linkError) {
      console.error("Error generating link:", linkError);
      throw new Error("Errore nella generazione del link di conferma");
    }

    const confirmLink = linkData?.properties?.action_link;
    if (!confirmLink) {
      throw new Error("Impossibile generare il link di conferma");
    }

    console.log(`Generated confirmation link for ${email}`);

    // Get email template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('template_key', 'confirmation_email')
      .maybeSingle();

    if (templateError) {
      console.error("Error fetching template:", templateError);
    }

    // Build email content
    let subject = "✉️ Conferma il tuo account Lovable Connect";
    let htmlContent = `
      <!DOCTYPE html>
      <html lang="it">
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f3e8ff;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
          <div style="max-width:600px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#ec4899,#9333ea);padding:40px 20px;text-align:center;">
              <h1 style="color:white;margin:0;font-size:28px;">✉️ Conferma il tuo Account</h1>
            </div>
            <div style="padding:40px 30px;text-align:center;">
              <p style="font-size:16px;color:#333;">Clicca sul pulsante qui sotto per confermare il tuo indirizzo email e attivare il tuo account.</p>
              <a href="{{confirmLink}}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#9333ea);color:white;padding:15px 40px;border-radius:25px;text-decoration:none;font-weight:bold;margin:20px 0;">Conferma Email</a>
              <p style="font-size:12px;color:#888;margin-top:30px;">Se non hai richiesto questa email, puoi ignorarla.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    if (template) {
      subject = template.subject;
      htmlContent = template.html_content;
    }

    const displayName = getDisplayName(null, existingUser);
    const templateVariables = {
      ...userTemplateVars(displayName, ['recipient']),
      confirmLink,
    };

    // Replace variables
    subject = replaceTemplateVars(subject, templateVariables);
    htmlContent = replaceTemplateVars(htmlContent, templateVariables);

    // Send email via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const { error: emailError } = await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error("Errore nell'invio dell'email");
    }

    console.log(`Confirmation email resent successfully to ${email}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email di conferma inviata con successo!" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in resend-confirmation-email:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
