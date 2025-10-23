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
      from: `Support Request <onboarding@resend.dev>`,
      replyTo: userEmail,
      to: ["loveableconnect@hotmail.com"],
      subject: `Richiesta Supporto da ${userEmail}`,
      html: `
        <h2>Nuova Richiesta di Supporto</h2>
        <p><strong>Da:</strong> ${userEmail}</p>
        <hr />
        <p>${message.replace(/\n/g, "<br>")}</p>
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
