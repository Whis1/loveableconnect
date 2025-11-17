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
    const { templateKey, testEmail } = await req.json();

    if (!templateKey) {
      throw new Error("templateKey è obbligatorio");
    }

    if (!testEmail) {
      throw new Error("testEmail è obbligatorio");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          userEmail: testEmail,
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY non configurata");
    }

    console.log(`Attempting to send test email for template: ${templateKey} to ${testEmail}`);
    
    const resend = new Resend(resendApiKey);

    let emailResult;
    try {
      emailResult = await resend.emails.send({
        from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
        to: [testEmail],
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
    } catch (sendError: any) {
      // Gestisce errore specifico di sandbox mode
      const errorMsg = sendError?.message || String(sendError);
      if (errorMsg.includes('testing emails') || errorMsg.includes('verify a domain')) {
        throw new Error(
          `🔒 Il dominio loveableconnect.com è in modalità Sandbox su Resend.\n\n` +
          `📧 Per testare ora, usa l'email: loveableconnect@hotmail.com\n\n` +
          `✅ Per inviare ad altri destinatari:\n` +
          `1. Vai su resend.com/domains\n` +
          `2. Clicca su loveableconnect.com\n` +
          `3. Attiva il dominio per produzione\n\n` +
          `Dettaglio errore: ${errorMsg}`
        );
      }
      throw sendError;
    }

    console.log(`Resend response:`, emailResult);
    
    if (emailResult.error) {
      console.error(`Resend error:`, emailResult.error);
      throw new Error(`Errore Resend: ${emailResult.error.message}`);
    }

    console.log(`Test email sent successfully. Email ID: ${emailResult.data?.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Email di test inviata a ${testEmail}` 
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
