import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getDisplayName, replaceTemplateVars, userTemplateVars } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REVISION = "2026-09-05-admin-templates-v1";
const RENEW_URL = "https://loveableconnect.it/credits";

const sha256Hex = async (text: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const planInfo = (subscriptionType?: string | null, premiumTier?: string | null) => {
  const type = (subscriptionType ?? "").toLowerCase();
  const tier = (premiumTier ?? "").toLowerCase();
  if (type === "weekly") return { planName: "Premium Settimanale", tier: "Settimanale" };
  if (type === "monthly" && tier === "standard") return { planName: "Platino", tier: "Platino" };
  if (type === "monthly") return { planName: "Premium Mensile", tier: "Premium" };
  return { planName: "Premium Mensile", tier: "Premium" };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // 1) Load both templates from the admin panel — no hardcoded fallbacks.
    const { data: templateRows, error: templatesError } = await supabaseClient
      .from("email_templates")
      .select("template_key, subject, html_content, updated_at")
      .in("template_key", ["subscription_expiring", "subscription_expired"]);

    if (templatesError) {
      console.error("Errore caricamento template:", templatesError);
      return jsonResponse({ error: "Impossibile caricare i template email", details: templatesError.message }, 500);
    }

    const byKey = new Map((templateRows ?? []).map((t) => [t.template_key, t]));
    const expiringTemplate = byKey.get("subscription_expiring");
    const expiredTemplate = byKey.get("subscription_expired");

    for (const [key, tmpl] of [
      ["subscription_expiring", expiringTemplate],
      ["subscription_expired", expiredTemplate],
    ] as const) {
      if (!tmpl || !tmpl.subject?.trim() || !tmpl.html_content?.trim()) {
        console.error(`Template mancante o incompleto: ${key}`);
        return jsonResponse({ error: `Template mancante o incompleto: ${key}` }, 500);
      }
    }

    // 5) Read-only dry run: no user data, no emails, no updates.
    if (new URL(req.url).searchParams.get("dry_run") === "true") {
      const templates = [];
      for (const tmpl of [expiringTemplate!, expiredTemplate!]) {
        templates.push({
          template_key: tmpl.template_key,
          updated_at: tmpl.updated_at,
          html_sha256: await sha256Hex(tmpl.html_content),
        });
      }
      return jsonResponse({
        success: true,
        dry_run: true,
        revision: REVISION,
        source: "email_templates",
        templates,
      });
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const now = new Date();

    let expiringSent = 0;
    let expiringFailed = 0;
    let expiredSent = 0;
    let expiredFailed = 0;

    const buildVariables = (
      recipientName: string,
      plan: { planName: string; tier: string },
      expiryDate: Date,
      daysLeft: number,
    ) => ({
      ...userTemplateVars(recipientName, ["recipient"]),
      subscriptionType: plan.planName,
      planName: plan.planName,
      tier: plan.tier,
      expiresAt: expiryDate.toLocaleDateString("it-IT"),
      expiryDate: expiryDate.toLocaleDateString("it-IT"),
      daysRemaining: daysLeft,
      daysLeft: daysLeft,
      daysText: `${daysLeft} ${daysLeft === 1 ? "giorno" : "giorni"}`,
      renewUrl: RENEW_URL,
      renewalUrl: RENEW_URL,
      reactivateUrl: RENEW_URL,
      freeCredits: 10,
      freeLikes: 5,
    });

    // ---- Subscriptions expiring within 3 days ----
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: expiringUsers, error: expiringError } = await supabaseClient
      .from("user_credits")
      .select("user_id, premium_expires_at, subscription_type, premium_tier")
      .eq("is_premium", true)
      .gte("premium_expires_at", now.toISOString())
      .lte("premium_expires_at", threeDaysFromNow.toISOString());

    if (expiringError) {
      console.error("Errore lettura abbonamenti in scadenza:", expiringError);
      return jsonResponse({ error: "Errore lettura abbonamenti in scadenza", details: expiringError.message }, 500);
    }

    for (const userCredit of expiringUsers ?? []) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("nickname, full_name")
        .eq("id", userCredit.user_id)
        .maybeSingle();

      const { data: { user } } = await supabaseClient.auth.admin.getUserById(userCredit.user_id);
      if (!user?.email) continue;

      const expiryDate = new Date(userCredit.premium_expires_at);
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const plan = planInfo(userCredit.subscription_type, userCredit.premium_tier);
      const variables = buildVariables(getDisplayName(profile, user), plan, expiryDate, daysLeft);

      try {
        const { error: sendError } = await resend.emails.send({
          from: "LoveableConnect <noreply@loveableconnect.com>",
          to: [user.email],
          subject: replaceTemplateVars(expiringTemplate!.subject, variables),
          html: replaceTemplateVars(expiringTemplate!.html_content, variables),
        });
        if (sendError) {
          expiringFailed++;
          console.error("Invio subscription_expiring fallito:", sendError);
        } else {
          expiringSent++;
          console.log(
            `Inviata subscription_expiring | revision=${REVISION} template_key=subscription_expiring template_updated_at=${expiringTemplate!.updated_at}`,
          );
        }
      } catch (emailError) {
        expiringFailed++;
        console.error("Errore invio subscription_expiring:", emailError);
      }
    }

    // ---- Subscriptions expired in the last 24 hours ----
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: expiredUsers, error: expiredError } = await supabaseClient
      .from("user_credits")
      .select("user_id, premium_expires_at, subscription_type, premium_tier")
      .eq("is_premium", true)
      .lt("premium_expires_at", now.toISOString())
      .gte("premium_expires_at", oneDayAgo.toISOString());

    if (expiredError) {
      console.error("Errore lettura abbonamenti scaduti:", expiredError);
      return jsonResponse({ error: "Errore lettura abbonamenti scaduti", details: expiredError.message }, 500);
    }

    for (const userCredit of expiredUsers ?? []) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("nickname, full_name")
        .eq("id", userCredit.user_id)
        .maybeSingle();

      const { data: { user } } = await supabaseClient.auth.admin.getUserById(userCredit.user_id);

      if (user?.email) {
        const expiryDate = new Date(userCredit.premium_expires_at);
        const plan = planInfo(userCredit.subscription_type, userCredit.premium_tier);
        const variables = buildVariables(getDisplayName(profile, user), plan, expiryDate, 0);

        try {
          const { error: sendError } = await resend.emails.send({
            from: "LoveableConnect <noreply@loveableconnect.com>",
            to: [user.email],
            subject: replaceTemplateVars(expiredTemplate!.subject, variables),
            html: replaceTemplateVars(expiredTemplate!.html_content, variables),
          });
          if (sendError) {
            expiredFailed++;
            console.error("Invio subscription_expired fallito:", sendError);
          } else {
            expiredSent++;
            console.log(
              `Inviata subscription_expired | revision=${REVISION} template_key=subscription_expired template_updated_at=${expiredTemplate!.updated_at}`,
            );
          }
        } catch (emailError) {
          expiredFailed++;
          console.error("Errore invio subscription_expired:", emailError);
        }
      }

      // Back to free plan: 10 credits / 5 likes
      const { error: updateError } = await supabaseClient
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

      if (updateError) {
        console.error("Errore aggiornamento user_credits:", updateError);
        return jsonResponse({ error: "Errore aggiornamento user_credits", details: updateError.message }, 500);
      }

      const { error: themeError } = await supabaseClient
        .from("profiles")
        .update({ profile_theme: "none" })
        .eq("id", userCredit.user_id);

      if (themeError) {
        console.error("Errore reset tema profilo:", themeError);
        return jsonResponse({ error: "Errore reset tema profilo", details: themeError.message }, 500);
      }
    }

    return jsonResponse({
      success: true,
      revision: REVISION,
      expiring_sent: expiringSent,
      expiring_failed: expiringFailed,
      expired_sent: expiredSent,
      expired_failed: expiredFailed,
    });
  } catch (error) {
    console.error("Errore in check-subscription-expiry:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: errorMessage }, 500);
  }
});
