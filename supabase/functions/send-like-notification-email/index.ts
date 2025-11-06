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

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [user.email],
      subject: "❤️ Hai ricevuto un nuovo Like!",
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Nuovo Like</title>
        </head>
        <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
          <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
            
            <!-- HEADER -->
            <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
              <div style="font-size:48px;">❤️</div>
              <h1 style="color:white; margin:10px 0 0; font-size:32px;">Hai un nuovo Like!</h1>
            </div>

            <!-- BODY -->
            <div style="padding:40px 30px;">
              <h2 style="color:#9333ea; font-size:24px; margin-bottom:15px;">Qualcuno ti ha notato! 💘</h2>
              <p style="color:#374151; font-size:16px; line-height:1.6;">
                <strong style="color:#ec4899;">${likerNickname}</strong> ha messo like al tuo profilo!
              </p>

              <p style="color:#374151; font-size:16px; line-height:1.6; margin-top:25px;">
                Entra su LoveableConnect per vedere il profilo e decidere se vuoi ricambiare il like.
              </p>

              <!-- BUTTON -->
              <div style="text-align:center; margin:35px 0;">
                <a href="${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '')}/likes"
                   style="background:linear-gradient(135deg,#ec4899,#9333ea);
                          color:white;
                          padding:16px 40px;
                          border-radius:12px;
                          font-weight:700;
                          text-decoration:none;
                          font-size:17px;
                          box-shadow:0 5px 20px rgba(147,51,234,0.3);">
                  💘 Vedi chi ti ha messo Like
                </a>
              </div>

              <!-- INFO BOX -->
              <div style="background:linear-gradient(135deg,#f3e8ff,#fce7f3); padding:25px; border-radius:12px; margin-top:25px;">
                <h3 style="color:#9333ea; margin-bottom:10px; font-size:18px;">💡 Suggerimento:</h3>
                <p style="color:#4b5563; font-size:15px; line-height:1.8; margin:0;">
                  Se ricambi il like, creerai un match e potrai iniziare a chattare! ✨
                </p>
              </div>
            </div>

            <!-- FOOTER -->
            <div style="background:#fafafa; padding:20px; text-align:center; border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af; font-size:12px;">💕 LoveableConnect – Dove nascono legami autentici</p>
            </div>

          </div>
        </body>
        </html>
      `,
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
