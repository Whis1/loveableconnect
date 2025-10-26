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
      from: `LoveableConnect Support <onboarding@resend.dev>`,
      replyTo: userEmail,
      to: ["loovableconnect@hotmail.com"],
      subject: `💬 Richiesta Supporto da ${userEmail}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background: #f9fafb;">
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            
            <div style="background: linear-gradient(135deg, #ec4899 0%, #9333ea 100%); padding: 30px 20px; text-align: center;">
              <div style="font-size: 36px; margin-bottom: 8px;">💬</div>
              <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 700;">Nuova Richiesta Supporto</h1>
            </div>

            <div style="padding: 30px;">
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Da:</strong></p>
                <p style="margin: 5px 0 0 0; color: #ec4899; font-size: 16px; font-weight: 600;">${userEmail}</p>
              </div>

              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">Messaggio:</p>
                <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>

              <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 13px;">
                  <strong>Rispondi a:</strong> <a href="mailto:${userEmail}" style="color: #9333ea; text-decoration: none;">${userEmail}</a>
                </p>
              </div>
            </div>

            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                💕 <strong style="color: #ec4899;">LoveableConnect</strong> Support System
              </p>
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
