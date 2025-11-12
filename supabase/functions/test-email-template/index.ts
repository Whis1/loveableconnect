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
    const { templateKey } = await req.json();

    if (!templateKey) {
      throw new Error("templateKey è obbligatorio");
    }

    // Get the authorization header to identify the requesting user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error("Non autenticato");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user?.email) {
      throw new Error("Utente non trovato o non autorizzato");
    }

    // Load template from DB
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .single();

    if (templateError || !template) {
      throw new Error("Template non trovato");
    }

    // Helper: replace {{placeholders}}
    const replaceVars = (text: string, vars: Record<string, string>) =>
      Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v ?? ''), text);

    // Create sample data based on template type
    let variables: Record<string, string> = {};

    switch (templateKey) {
      case 'like_notification':
        variables = {
          likerNickname: 'TestUser123',
        };
        break;
      
      case 'message_notification':
        variables = {
          senderNickname: 'TestUser123',
          messagePreview: 'Ciao! Questo è un messaggio di prova per testare il template email.',
        };
        break;
      
      case 'purchase_credits':
        variables = {
          creditsAmount: '100',
          amountPaid: '9.99',
          newBalance: '116',
        };
        break;
      
      case 'subscription_purchased':
        variables = {
          subscriptionType: 'Premium Mensile',
          tier: 'gold',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          benefits: '<li>✨ Chat illimitate</li><li>💬 Messaggi vocali</li><li>👁️ Vedi chi ti ha messo like</li><li>🔓 Like illimitati</li>',
        };
        break;
      
      case 'subscription_renewed':
        variables = {
          subscriptionType: 'Premium Mensile',
          tier: 'gold',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
        };
        break;
      
      case 'subscription_expired':
        variables = {
          subscriptionType: 'Premium Mensile',
        };
        break;
      
      case 'subscription_expiring':
        variables = {
          subscriptionType: 'Premium Mensile',
          daysRemaining: '3',
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
        };
        break;
      
      case 'gift_subscription':
        variables = {
          senderNickname: 'TestUser123',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          benefits: '<li>✨ Chat illimitate</li><li>💬 Messaggi vocali</li><li>👁️ Vedi chi ti ha messo like</li>',
        };
        break;
      
      case 'confirmation_email':
        variables = {
          confirmLink: 'https://loveable.app/confirm?token=test123456',
        };
        break;
      
      case 'reset_password':
        variables = {
          resetLink: 'https://loveable.app/reset-password?token=test123456',
        };
        break;
      
      case 'support_email':
        variables = {
          userEmail: user.email,
          message: 'Questo è un messaggio di test per il supporto.',
        };
        break;
      
      case 'unlock_payment':
        variables = {
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
        };
        break;
      
      default:
        variables = {};
    }

    const subject = replaceVars(template.subject, variables);
    const html = replaceVars(template.html_content, variables);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [user.email],
      subject: `[TEST] ${subject}`,
      html: `
        <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center;">
          <strong style="color: #856404;">⚠️ EMAIL DI TEST</strong>
          <p style="margin: 5px 0; color: #856404; font-size: 14px;">
            Questa è un'email di prova del template "${template.template_name}".<br/>
            I dati mostrati sono solo di esempio.
          </p>
        </div>
        ${html}
      `,
    });

    console.log(`Test email sent for template: ${templateKey} to ${user.email}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Email di test inviata a ${user.email}` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Errore nell'invio dell'email di test:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
