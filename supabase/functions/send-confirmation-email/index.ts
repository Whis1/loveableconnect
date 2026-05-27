import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { replaceTemplateVars, userTemplateVars } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, confirmLink } = await req.json();

    console.log('Sending confirmation email to:', email);

    if (!email) {
      throw new Error("Email è obbligatoria.");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Carica template dal database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'confirmation_email')
      .single();

    if (templateError || !template) {
      throw new Error("Template non trovato");
    }

    const displayName = email.split("@")[0] || "Utente";
    const variables = {
      ...userTemplateVars(displayName, ['recipient']),
      confirmLink: confirmLink || 'https://loveableconnect.com/auth/confirm'
    };

    const subject = replaceTemplateVars(template.subject, variables);
    const html = replaceTemplateVars(template.html_content, variables);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY non configurata");
    }

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [email],
      subject,
      html,
    });

    if (error) {
      throw error;
    }

    console.log('Confirmation email sent successfully:', data);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
