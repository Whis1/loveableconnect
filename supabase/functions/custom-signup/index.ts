import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { replaceTemplateVars, userTemplateVars } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
  birthdate: string;
  city: string;
  gender: string;
  sexual_orientation: string;
  relationship_status: string;
  redirect_to: string;
}

const NICKNAME_TAKEN_MESSAGE = "Nickname già utilizzato da un altro utente";

const normalizeNickname = (value: string | null | undefined): string => (value ?? "").trim();

const nicknameKey = (value: string | null | undefined): string =>
  normalizeNickname(value).toLocaleLowerCase("it-IT");

const escapeIlikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`);

const isNicknameDuplicateError = (error: unknown): boolean => {
  const anyError = error as { code?: string; message?: string; details?: string; hint?: string };
  const text = `${anyError?.code ?? ""} ${anyError?.message ?? ""} ${anyError?.details ?? ""} ${anyError?.hint ?? ""}`.toLowerCase();
  return text.includes("23505") || text.includes("duplicate key") || text.includes("profiles_nickname_unique_ci");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      password, 
      nickname, 
      birthdate, 
      city, 
      gender, 
      sexual_orientation, 
      relationship_status,
      redirect_to 
    }: SignupRequest = await req.json();

    console.log("Custom signup request for:", email);
    const cleanNickname = normalizeNickname(nickname);

    if (!cleanNickname) {
      return new Response(
        JSON.stringify({ error: "Inserisci un nickname valido." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    const { data: existingProfiles, error: nicknameCheckError } = await supabaseAdmin
      .from("profiles")
      .select("id, nickname")
      .ilike("nickname", escapeIlikePattern(cleanNickname))
      .limit(25);

    if (nicknameCheckError) {
      console.error("Error checking nickname:", nicknameCheckError);
      throw nicknameCheckError;
    }

    const nicknameAlreadyExists = (existingProfiles ?? []).some((profile) =>
      nicknameKey(profile.nickname) === nicknameKey(cleanNickname)
    );

    if (nicknameAlreadyExists) {
      return new Response(
        JSON.stringify({ error: NICKNAME_TAKEN_MESSAGE }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate signup link - this creates the user AND returns confirmation link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo: redirect_to,
        data: {
          nickname: cleanNickname,
          birthdate,
          city,
          gender,
          sexual_orientation,
          relationship_status,
        },
      },
    });

    if (linkError) {
      console.error("Error generating signup link:", linkError);
      throw linkError;
    }

    console.log("User created and confirmation link generated for:", linkData.user?.id);

    // Get the confirmation URL from the link data
    const confirmationUrl = linkData.properties?.action_link;

    if (!confirmationUrl) {
      throw new Error("No confirmation URL generated");
    }

    // Fetch email template from database
    const { data: template, error: templateError } = await supabaseAdmin
      .from("email_templates")
      .select("subject, html_content")
      .eq("template_key", "confirmation_email")
      .single();

    if (templateError || !template) {
      console.error("Error fetching template:", templateError);
      throw new Error("Email template not found");
    }

    const templateVariables = {
      ...userTemplateVars(cleanNickname || "Utente", ['recipient']),
      confirmLink: confirmationUrl,
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
      console.error("Error sending confirmation email:", emailError);
      throw emailError;
    }

    console.log("Confirmation email sent to:", email);

    // Invia email di benvenuto
    const { data: welcomeTemplate } = await supabaseAdmin
      .from("email_templates")
      .select("subject, html_content")
      .eq("template_key", "welcome_email")
      .single();

    if (welcomeTemplate) {
      const welcomeHtml = replaceTemplateVars(welcomeTemplate.html_content, templateVariables);
      const welcomeSubject = replaceTemplateVars(welcomeTemplate.subject, templateVariables);
      
      const { error: welcomeEmailError } = await resend.emails.send({
        from: "Lovable Connect <noreply@loveableconnect.com>",
        to: [email],
        subject: welcomeSubject,
        html: welcomeHtml,
      });

      if (welcomeEmailError) {
        console.error("Error sending welcome email:", welcomeEmailError);
        // Non bloccare la registrazione se l'email di benvenuto fallisce
      } else {
        console.log("Welcome email sent to:", email);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: linkData.user,
        message: "User created and confirmation email sent" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in custom-signup:", error);

    if (isNicknameDuplicateError(error)) {
      return new Response(
        JSON.stringify({ error: NICKNAME_TAKEN_MESSAGE }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Handle duplicate email error
    if (error.message?.includes("already been registered") || error.message?.includes("already exists") || error.message?.includes("duplicate key")) {
      return new Response(
        JSON.stringify({ error: "Un account con questa email esiste già" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
