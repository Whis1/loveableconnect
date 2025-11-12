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
      from: "LoveableConnect 💕 <onboarding@resend.dev>",
      to: [email],
      subject: "🔐 Reimposta la tua Password - LoveableConnect",
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
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Reset Password</h1>
                <p style="color:rgba(255,255,255,0.95); font-size:16px; margin-top:10px;">🔐 Recupera l'accesso al tuo account</p>
              </div>
              
              <!-- BODY -->
              <div style="padding:40px 30px;">
                <h2 style="color:#9333ea; font-size:24px; margin-bottom:15px; font-weight:700;">Richiesta Reset Password 🔑</h2>
                <p style="color:#374151; font-size:16px; line-height:1.6;">
                  Ciao! Abbiamo ricevuto una richiesta per reimpostare la password del tuo account <strong style="color:#ec4899;">LoveableConnect</strong>.
                </p>
                
                <p style="color:#374151; font-size:16px; line-height:1.6; margin-top:20px;">
                  Clicca sul pulsante qui sotto per creare una nuova password sicura:
                </p>
                
                <!-- BUTTON -->
                <div style="text-align:center; margin:35px 0;">
                  <a href="${resetUrl}" 
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
                    🔓 Reimposta Password
                  </a>
                </div>
                
                <!-- INFO BOX -->
                <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5); padding:20px; border-radius:12px; border-left:5px solid #f97316; margin-top:30px;">
                  <p style="margin:0; color:#92400e; font-size:14px; line-height:1.5;">
                    <strong>⏰ Importante:</strong> Questo link è valido per <strong>2 ore</strong>. Dopo scadrà per motivi di sicurezza.
                  </p>
                </div>
                
                <!-- WARNING BOX -->
                <div style="background:linear-gradient(135deg,#fee2e2,#fecaca); padding:20px; border-radius:12px; border-left:5px solid #ef4444; margin-top:20px;">
                  <p style="margin:0; color:#991b1b; font-size:14px; line-height:1.5;">
                    <strong>🚨 Non hai richiesto tu questo reset?</strong><br/>
                    Ignora questa email in sicurezza. La tua password rimarrà invariata e il tuo account è protetto.
                  </p>
                </div>
                
                <!-- SECURITY TIPS -->
                <div style="background:linear-gradient(135deg,#f3e8ff,#fce7f3); padding:25px; border-radius:16px; margin-top:30px; border:2px solid rgba(236,72,153,0.1);">
                  <h3 style="color:#9333ea; margin-bottom:15px; font-size:18px; font-weight:700;">🛡️ Suggerimenti per la sicurezza:</h3>
                  <ul style="color:#4b5563; font-size:14px; line-height:1.8; margin:0; padding-left:0; list-style:none;">
                    <li>🔒 Usa una password lunga e complessa</li>
                    <li>🎲 Combina lettere maiuscole, minuscole, numeri e simboli</li>
                    <li>🚫 Non riutilizzare password di altri siti</li>
                    <li>📝 Considera l'uso di un password manager</li>
                  </ul>
                </div>
                
                <!-- ALTERNATE LINK -->
                <div style="margin-top:30px; background:#f9fafb; padding:18px; border-radius:12px; border:1px solid #e5e7eb;">
                  <p style="color:#6b7280; font-size:13px; line-height:1.6; margin:0 0 8px 0;">
                    <strong>Il pulsante non funziona?</strong> Copia e incolla questo link nel tuo browser:
                  </p>
                  <a href="${resetUrl}" style="color:#9333ea; font-size:12px; word-break:break-all; font-weight:600;">${resetUrl}</a>
                </div>
              </div>
              
              <!-- FOOTER -->
              <div style="background:linear-gradient(135deg,#fafafa,#f3f4f6); padding:25px; text-align:center; border-top:2px solid #e5e7eb;">
                <p style="color:#6b7280; font-size:14px; margin:5px 0; font-weight:600;">💕 LoveableConnect</p>
                <p style="color:#9ca3af; font-size:12px; margin:5px 0;">La tua app per incontrare persone speciali</p>
                <p style="color:#9ca3af; font-size:12px; margin-top:15px;">Hai bisogno di aiuto? Contatta il nostro supporto</p>
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
