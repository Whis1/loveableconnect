import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordEmailRequest {
  email: string;
  redirect_to: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirect_to }: ResetPasswordEmailRequest = await req.json();
    
    if (!email || !redirect_to) {
      throw new Error("Email e redirect_to sono obbligatori.");
    }

    // Create Supabase admin client to generate reset link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Generate password reset link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirect_to
      }
    });

    if (linkError) {
      throw new Error(`Failed to generate reset link: ${linkError.message}`);
    }

    const resetUrl = linkData.properties.action_link;

    const emailResponse = await resend.emails.send({
      from: "Arrettu <onboarding@resend.dev>",
      to: [email],
      subject: "🔐 Reimposta la tua Password - Arrettu",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #fce7f3 0%, #e9d5ff 50%, #ddd6fe 100%);
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              }
              .header {
                background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
                padding: 40px 20px;
                text-align: center;
              }
              .logo {
                font-size: 48px;
                margin-bottom: 10px;
              }
              .header h1 {
                color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 700;
              }
              .content {
                padding: 40px 30px;
              }
              .content h2 {
                color: #1f2937;
                font-size: 24px;
                margin-bottom: 20px;
              }
              .content p {
                color: #6b7280;
                margin-bottom: 20px;
                font-size: 16px;
              }
              .button-container {
                text-align: center;
                margin: 35px 0;
              }
              .button {
                display: inline-block;
                padding: 16px 40px;
                background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
                color: white;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 15px rgba(236, 72, 153, 0.3);
                transition: transform 0.2s;
              }
              .button:hover {
                transform: translateY(-2px);
              }
              .info-box {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                margin: 25px 0;
                border-radius: 8px;
              }
              .info-box p {
                margin: 0;
                color: #92400e;
                font-size: 14px;
              }
              .warning-box {
                background: #fee2e2;
                border-left: 4px solid #ef4444;
                padding: 16px;
                margin: 25px 0;
                border-radius: 8px;
              }
              .warning-box p {
                margin: 0;
                color: #991b1b;
                font-size: 14px;
              }
              .footer {
                background: #f9fafb;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
              }
              .footer p {
                color: #9ca3af;
                font-size: 14px;
                margin: 5px 0;
              }
              .emoji {
                font-size: 24px;
                margin-right: 8px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">💘</div>
                <h1>Arrettu - Reset Password</h1>
              </div>
              
              <div class="content">
                <h2>🔐 Richiesta Reset Password</h2>
                <p>Ciao! Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Arrettu.</p>
                
                <p>Clicca sul pulsante qui sotto per creare una nuova password:</p>
                
                <div class="button-container">
                  <a href="${resetUrl}" class="button">
                    Reimposta Password
                  </a>
                </div>
                
                <div class="info-box">
                  <p><span class="emoji">⏰</span><strong>Importante:</strong> Questo link è valido per 2 ore.</p>
                </div>
                
                <div class="warning-box">
                  <p><span class="emoji">🚨</span><strong>Non hai richiesto tu questo reset?</strong> Ignora questa email, la tua password rimarrà invariata e il tuo account è al sicuro.</p>
                </div>
                
                <p style="margin-top: 30px; color: #9ca3af; font-size: 14px;">
                  Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
                  <a href="${resetUrl}" style="color: #a855f7; word-break: break-all;">${resetUrl}</a>
                </p>
              </div>
              
              <div class="footer">
                <p><strong>💘 Arrettu</strong></p>
                <p>La tua app per incontrare persone speciali</p>
                <p style="margin-top: 20px;">Hai bisogno di aiuto? Contatta il nostro supporto</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Reset password email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-reset-password-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
