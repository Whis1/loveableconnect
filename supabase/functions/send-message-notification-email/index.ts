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
    const { receiverId, senderNickname, messagePreview } = await req.json();

    if (!receiverId || !senderNickname) {
      throw new Error("receiverId e senderNickname sono obbligatori");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is online
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_active')
      .eq('id', receiverId)
      .single();

    // Don't send email if user was active in the last 5 minutes
    if (profile?.last_active) {
      const lastActive = new Date(profile.last_active);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastActive.getTime()) / 1000 / 60;
      
      if (diffMinutes < 5) {
        console.log("User is online, skipping email");
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Get user email from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(receiverId);
    
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
      subject: "💬 Nuovo Messaggio da " + senderNickname,
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Nuovo Messaggio</title>
        </head>
        <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
          <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
            
            <!-- HEADER -->
            <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
              <div style="font-size:48px;">💬</div>
              <h1 style="color:white; margin:10px 0 0; font-size:32px;">Nuovo Messaggio!</h1>
            </div>

            <!-- BODY -->
            <div style="padding:40px 30px;">
              <h2 style="color:#9333ea; font-size:24px; margin-bottom:15px;">Hai un nuovo messaggio 📩</h2>
              <p style="color:#374151; font-size:16px; line-height:1.6;">
                <strong style="color:#ec4899;">${senderNickname}</strong> ti ha scritto:
              </p>

              ${messagePreview ? `
              <!-- MESSAGE PREVIEW -->
              <div style="background:#f9fafb; border-left:4px solid #9333ea; padding:20px; margin:25px 0; border-radius:8px;">
                <p style="color:#6b7280; font-size:15px; line-height:1.6; margin:0; font-style:italic;">
                  "${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}"
                </p>
              </div>
              ` : ''}

              <p style="color:#374151; font-size:16px; line-height:1.6; margin-top:25px;">
                Rispondi subito per continuare la conversazione!
              </p>

              <!-- BUTTON -->
              <div style="text-align:center; margin:35px 0;">
                <a href="${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '')}/messages"
                   style="background:linear-gradient(135deg,#ec4899,#9333ea);
                          color:white;
                          padding:16px 40px;
                          border-radius:12px;
                          font-weight:700;
                          text-decoration:none;
                          font-size:17px;
                          box-shadow:0 5px 20px rgba(147,51,234,0.3);">
                  💬 Leggi il Messaggio
                </a>
              </div>

              <!-- INFO BOX -->
              <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5); padding:20px; border-radius:12px; border-left:4px solid #f97316;">
                <p style="margin:0; color:#92400e; font-size:14px; line-height:1.5;">
                  💡 Riceverai queste email solo quando non sei online sulla piattaforma.
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
    console.error("Errore nell'invio dell'email di notifica messaggio:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
