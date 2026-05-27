import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getDisplayName, replaceTemplateVars, userTemplateVars } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  email: string;
  redirect_to: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirect_to }: ResetPasswordRequest = await req.json();

    console.log("Custom reset password request for:", email);

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user exists
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      throw listError;
    }

    const existingUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!existingUser) {
      // Don't reveal if user exists or not for security
      console.log("User not found, but returning success for security");
      return new Response(
        JSON.stringify({ success: true, message: "If the email exists, a reset link has been sent" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate password reset link using Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirect_to,
      },
    });

    if (linkError) {
      console.error("Error generating reset link:", linkError);
      throw linkError;
    }

    console.log("Reset link generated");

    // Get the reset URL from the link data
    const resetUrl = linkData.properties?.action_link;

    if (!resetUrl) {
      throw new Error("No reset URL generated");
    }

    // Fetch email template from database
    const { data: template, error: templateError } = await supabaseAdmin
      .from("email_templates")
      .select("subject, html_content")
      .eq("template_key", "reset_password")
      .single();

    if (templateError || !template) {
      console.error("Error fetching template:", templateError);
      throw new Error("Email template not found");
    }

    const displayName = getDisplayName(null, existingUser);
    const templateVariables = {
      ...userTemplateVars(displayName, ['recipient']),
      resetLink: resetUrl,
    };
    const subject = replaceTemplateVars(template.subject, templateVariables);
    const htmlContent = replaceTemplateVars(template.html_content, templateVariables);

    // Send email using Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const { error: emailError } = await resend.emails.send({
      from: "Lovable Connect <noreply@loveableconnect.com>",
      to: [email],
      subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log("Reset password email sent to:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Reset password email sent" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in custom-reset-password:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
