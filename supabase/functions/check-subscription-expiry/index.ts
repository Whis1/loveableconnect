import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getDisplayName, replaceTemplateVars, userTemplateVars } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UserCreditRow = {
  user_id: string;
  premium_expires_at: string;
  subscription_type?: string | null;
  premium_tier?: string | null;
};

type EmailTemplate = {
  subject: string;
  html_content: string;
};

const siteUrl = "https://loveableconnect.it";

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const getPlanName = (subscriptionType?: string | null, premiumTier?: string | null) => {
  if (subscriptionType === "weekly") return "Premium Settimanale";
  if (subscriptionType === "monthly" && premiumTier === "standard") return "Platino";
  if (subscriptionType === "monthly") return "Premium Mensile";
  return "Premium";
};

const getTierName = (subscriptionType?: string | null, premiumTier?: string | null) => {
  if (subscriptionType === "weekly") return "Settimanale";
  if (premiumTier === "standard") return "Platino";
  return "Premium";
};

const loadTemplate = async (supabase: ReturnType<typeof createClient>, templateKey: string) => {
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_content")
    .eq("template_key", templateKey)
    .maybeSingle();

  if (error) {
    console.error(`Template ${templateKey} non caricato:`, error);
    return null;
  }

  return data as EmailTemplate | null;
};

const buildVariables = (
  recipientName: string,
  userCredit: UserCreditRow,
  extra: Record<string, string | number> = {},
) => {
  const planName = getPlanName(userCredit.subscription_type, userCredit.premium_tier);
  const tier = getTierName(userCredit.subscription_type, userCredit.premium_tier);
  const expiresAt = formatDate(userCredit.premium_expires_at);

  return {
    ...userTemplateVars(recipientName, ["recipient", "receiver", "user"]),
    subscriptionType: planName,
    planName,
    tier,
    expiresAt,
    expiryDate: expiresAt,
    renewalUrl: `${siteUrl}/credits`,
    reactivateUrl: `${siteUrl}/credits`,
    freeCredits: 10,
    freeLikes: 5,
    benefits:
      "<li>Crediti e like secondo il piano acquistato</li><li>Accesso ai vantaggi Premium/Platino finche' l'abbonamento e' attivo</li>",
    ...extra,
  };
};

const fallbackExpiringHtml = (variables: Record<string, string | number | boolean | null | undefined>) => `
  <!DOCTYPE html>
  <html lang="it">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background:#fff7ed; font-family:'Segoe UI',Roboto,Arial,sans-serif;">
      <div style="max-width:600px; margin:32px auto; background:#ffffff; border-radius:18px; overflow:hidden;">
        <div style="background:#f59e0b; color:#ffffff; padding:32px 24px; text-align:center;">
          <div style="font-size:48px;">⏰</div>
          <h1 style="margin:8px 0 0;">Abbonamento in Scadenza</h1>
          <p style="margin:8px 0 0;">Il tuo abbonamento sta per scadere</p>
        </div>
        <div style="padding:28px 24px; color:#374151;">
          <p>Ciao ${variables.userName}, il tuo abbonamento <strong>${variables.subscriptionType}</strong> scadra' tra <strong>${variables.daysRemaining} ${variables.daysRemaining === 1 ? "giorno" : "giorni"}</strong>.</p>
          <p>Data di scadenza: <strong>${variables.expiresAt}</strong></p>
          <p>Dopo la scadenza tornerai al piano gratuito con <strong>10 crediti</strong> e <strong>5 like giornalieri</strong>.</p>
          <p style="text-align:center; margin-top:28px;">
            <a href="${siteUrl}/credits" style="display:inline-block; background:#ec4899; color:white; padding:14px 28px; border-radius:12px; text-decoration:none; font-weight:700;">Rinnova Ora</a>
          </p>
        </div>
      </div>
    </body>
  </html>
`;

const fallbackExpiredHtml = (variables: Record<string, string | number | boolean | null | undefined>) => `
  <!DOCTYPE html>
  <html lang="it">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background:#fef2f2; font-family:'Segoe UI',Roboto,Arial,sans-serif;">
      <div style="max-width:600px; margin:32px auto; background:#ffffff; border-radius:18px; overflow:hidden;">
        <div style="background:#dc2626; color:#ffffff; padding:32px 24px; text-align:center;">
          <div style="font-size:48px;">💔</div>
          <h1 style="margin:8px 0 0;">Abbonamento Scaduto</h1>
          <p style="margin:8px 0 0;">Il tuo abbonamento e' scaduto</p>
        </div>
        <div style="padding:28px 24px; color:#374151;">
          <p>Ciao ${variables.userName}, il tuo abbonamento <strong>${variables.subscriptionType}</strong> e' scaduto il <strong>${variables.expiresAt}</strong>.</p>
          <p>Sei tornato al piano gratuito con <strong>10 crediti</strong> e <strong>5 like giornalieri</strong>.</p>
          <p style="text-align:center; margin-top:28px;">
            <a href="${siteUrl}/credits" style="display:inline-block; background:#ec4899; color:white; padding:14px 28px; border-radius:12px; text-decoration:none; font-weight:700;">Riattiva Premium</a>
          </p>
        </div>
      </div>
    </body>
  </html>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const now = new Date();

    const [expiringTemplate, expiredTemplate] = await Promise.all([
      loadTemplate(supabase, "subscription_expiring"),
      loadTemplate(supabase, "subscription_expired"),
    ]);

    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: expiringUsers, error: expiringError } = await supabase
      .from("user_credits")
      .select("user_id, premium_expires_at, subscription_type, premium_tier")
      .eq("is_premium", true)
      .gte("premium_expires_at", now.toISOString())
      .lte("premium_expires_at", threeDaysFromNow.toISOString());

    if (expiringError) {
      console.error("Error fetching expiring subscriptions:", expiringError);
    }

    if (expiringUsers && expiringUsers.length > 0) {
      console.log(`Found ${expiringUsers.length} subscriptions expiring soon`);

      for (const userCredit of expiringUsers as UserCreditRow[]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, nickname, full_name")
          .eq("id", userCredit.user_id)
          .maybeSingle();

        if (!profile) continue;

        const { data: { user } } = await supabase.auth.admin.getUserById(userCredit.user_id);
        if (!user?.email) continue;

        const expiryDate = new Date(userCredit.premium_expires_at);
        const daysLeft = Math.max(1, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const recipientName = getDisplayName(profile, user);
        const variables = buildVariables(recipientName, userCredit, {
          daysRemaining: daysLeft,
          daysLeft,
          daysText: `${daysLeft} ${daysLeft === 1 ? "giorno" : "giorni"}`,
        });

        const subject = expiringTemplate
          ? replaceTemplateVars(expiringTemplate.subject, variables)
          : `Il tuo abbonamento scade tra ${daysLeft} ${daysLeft === 1 ? "giorno" : "giorni"} ⏰`;
        const html = expiringTemplate
          ? replaceTemplateVars(expiringTemplate.html_content, variables)
          : fallbackExpiringHtml(variables);

        try {
          await resend.emails.send({
            from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
            to: [user.email],
            subject,
            html,
          });
          console.log(`Expiry warning sent to ${user.email}`);
        } catch (emailError) {
          console.error(`Error sending expiry warning to ${user.email}:`, emailError);
        }
      }
    }

    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: expiredUsers, error: expiredError } = await supabase
      .from("user_credits")
      .select("user_id, premium_expires_at, subscription_type, premium_tier")
      .eq("is_premium", true)
      .lt("premium_expires_at", now.toISOString())
      .gte("premium_expires_at", oneDayAgo.toISOString());

    if (expiredError) {
      console.error("Error fetching expired subscriptions:", expiredError);
    }

    if (expiredUsers && expiredUsers.length > 0) {
      console.log(`Found ${expiredUsers.length} expired subscriptions`);

      for (const userCredit of expiredUsers as UserCreditRow[]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, nickname, full_name")
          .eq("id", userCredit.user_id)
          .maybeSingle();

        if (!profile) continue;

        const { data: { user } } = await supabase.auth.admin.getUserById(userCredit.user_id);
        if (!user?.email) continue;

        const recipientName = getDisplayName(profile, user);
        const variables = buildVariables(recipientName, userCredit);

        const subject = expiredTemplate
          ? replaceTemplateVars(expiredTemplate.subject, variables)
          : "Il tuo abbonamento e' scaduto 💔";
        const html = expiredTemplate
          ? replaceTemplateVars(expiredTemplate.html_content, variables)
          : fallbackExpiredHtml(variables);

        try {
          await resend.emails.send({
            from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
            to: [user.email],
            subject,
            html,
          });
          console.log(`Expiry notification sent to ${user.email}`);
        } catch (emailError) {
          console.error(`Error sending expiry notification to ${user.email}:`, emailError);
        }

        await supabase
          .from("user_credits")
          .update({
            is_premium: false,
            subscription_type: "none",
            premium_tier: "none",
            premium_expires_at: null,
            balance: 10,
            daily_likes_remaining: 5,
            daily_free_chats_remaining: 0,
            daily_likes_reset_at: null,
            daily_free_chats_reset_at: null,
            credits_depleted_at: null,
            updated_at: now.toISOString(),
          })
          .eq("user_id", userCredit.user_id);

        await supabase
          .from("profiles")
          .update({ profile_theme: "none" })
          .eq("id", userCredit.user_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiring_notified: expiringUsers?.length || 0,
        expired_notified: expiredUsers?.length || 0,
        templates_used: {
          subscription_expiring: Boolean(expiringTemplate),
          subscription_expired: Boolean(expiredTemplate),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in check-subscription-expiry:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
