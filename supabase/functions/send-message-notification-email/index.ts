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
      subject: `💬 Nuovo messaggio da ${senderNickname}`,
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
                <div style="font-size:60px; margin-bottom:10px;">💬</div>
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Nuovo Messaggio!</h1>
                <p style="color:rgba(255,255,255,0.95); font-size:16px; margin-top:10px;">✨ Qualcuno ti ha scritto!</p>
              </div>
              
              <!-- BODY -->
              <div style="padding:40px 30px;">
                <h2 style="color:#9333ea; font-size:24px; margin-bottom:15px; font-weight:700;">Messaggio da ${senderNickname} 💌</h2>
                <p style="color:#374151; font-size:16px; line-height:1.6;">
                  <strong style="color:#ec4899;">${senderNickname}</strong> ti ha inviato un nuovo messaggio su LoveableConnect!
                </p>
                
                ${messagePreview ? `
                  <div style="background:linear-gradient(135deg,#f3e8ff,#fce7f3); padding:20px; border-radius:12px; margin:25px 0; border-left:5px solid #9333ea;">
                    <p style="margin:0; color:#4b5563; font-size:15px; line-height:1.6; font-style:italic;">
                      "${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}"
                    </p>
                  </div>
                ` : ''}
                
                <p style="color:#374151; font-size:16px; line-height:1.6; margin-top:20px;">
                  Non lasciare aspettare! Rispondi ora e continua la conversazione! 🎉
                </p>
                
                <!-- BUTTON -->
                <div style="text-align:center; margin:35px 0;">
                  <a href="${supabaseUrl.replace('.supabase.co', '')}/messages" 
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
                    💬 Leggi e Rispondi
                  </a>
                </div>
                
                <!-- TIPS -->
                <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5); padding:20px; border-radius:12px; margin-top:25px; border:2px solid rgba(249,115,22,0.2);">
                  <p style="margin:0; color:#92400e; font-size:14px; line-height:1.6; text-align:center;">
                    💡 <strong>Suggerimento:</strong> Le risposte veloci aumentano le possibilità di creare una connessione autentica!
                  </p>
                </div>
              </div>
              
              <!-- FOOTER -->
              <div style="background:linear-gradient(135deg,#fafafa,#f3f4f6); padding:25px; text-align:center; border-top:2px solid #e5e7eb;">
                <p style="color:#6b7280; font-size:14px; margin:5px 0; font-weight:600;">💕 LoveableConnect</p>
                <p style="color:#9ca3af; font-size:12px; margin:5px 0;">Dove nascono legami autentici</p>
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
