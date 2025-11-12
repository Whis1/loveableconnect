import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  userEmail: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, message }: SupportEmailRequest = await req.json();

    console.log("Sending support email from:", userEmail);

    const emailResponse = await resend.emails.send({
      from: "LoveableConnect Support 💕 <onboarding@resend.dev>",
      replyTo: userEmail,
      to: ["daishxvii@gmail.com"],
      subject: `🆘 Nuovo messaggio di supporto da ${userEmail}`,
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
                <div style="font-size:60px; margin-bottom:10px;">🆘</div>
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Richiesta Supporto</h1>
                <p style="color:rgba(255,255,255,0.95); font-size:16px; margin-top:10px;">Nuovo messaggio dall'utente</p>
              </div>
              
              <!-- BODY -->
              <div style="padding:40px 30px;">
                <h2 style="color:#9333ea; font-size:24px; margin-bottom:15px; font-weight:700;">Dettagli Utente 👤</h2>
                
                <!-- USER INFO -->
                <div style="background:linear-gradient(135deg,#f3e8ff,#fce7f3); padding:20px; border-radius:12px; margin:20px 0; border:2px solid rgba(236,72,153,0.1);">
                  <p style="margin:0 0 10px 0; color:#4b5563; font-size:15px;">
                    <strong style="color:#9333ea;">Email:</strong> ${userEmail}
                  </p>
                  <p style="margin:0; color:#4b5563; font-size:14px;">
                    <strong style="color:#9333ea;">Data:</strong> ${new Date().toLocaleString('it-IT')}
                  </p>
                </div>
                
                <h3 style="color:#9333ea; font-size:20px; margin:25px 0 15px 0; font-weight:700;">💬 Messaggio:</h3>
                
                <!-- MESSAGE -->
                <div style="background:#f9fafb; padding:25px; border-radius:12px; border-left:5px solid #ec4899;">
                  <p style="margin:0; color:#374151; font-size:15px; line-height:1.8; white-space:pre-wrap;">
                    ${message}
                  </p>
                </div>
                
                <!-- ACTION REQUIRED -->
                <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5); padding:20px; border-radius:12px; margin-top:25px; border:2px solid rgba(249,115,22,0.2); text-align:center;">
                  <p style="margin:0; color:#92400e; font-size:14px; line-height:1.6;">
                    <strong>⚡ Azione richiesta:</strong> Rispondi all'utente il prima possibile per fornire assistenza!
                  </p>
                </div>
              </div>
              
              <!-- FOOTER -->
              <div style="background:linear-gradient(135deg,#fafafa,#f3f4f6); padding:25px; text-align:center; border-top:2px solid #e5e7eb;">
                <p style="color:#6b7280; font-size:14px; margin:5px 0; font-weight:600;">💕 LoveableConnect Support Team</p>
                <p style="color:#9ca3af; font-size:12px; margin:5px 0;">Sistema di gestione richieste utenti</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Support email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending support email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
