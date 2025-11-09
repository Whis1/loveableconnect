import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// VAPID configuration
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const CONTACT_EMAIL = "mailto:support@loveableconnect.app";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("VAPID keys not configured");
}

// Configure web-push
webpush.setVapidDetails(CONTACT_EMAIL, VAPID_PUBLIC_KEY || "", VAPID_PRIVATE_KEY || "");

// Supabase client with service role
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface IncomingPayload {
  user_id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown> | null;
  notification_id?: string;
}

async function sendToUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> | null },
  notificationId?: string
) {
  // Fetch subscriptions
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) throw error;

  let sentCount = 0;
  let failedCount = 0;

  const webPayload = JSON.stringify({
    title: payload.title || "LoveableConnect",
    body: payload.body || "Hai una nuova notifica",
    data: payload.data || { url: "/" },
  });

  for (const sub of subs || []) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    } as any;

    try {
      await webpush.sendNotification(subscription, webPayload, { TTL: 60 });
      sentCount++;
    } catch (err: any) {
      failedCount++;
      const status = err?.statusCode ?? err?.status ?? 0;
      // Remove invalid subscriptions
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
      console.error("Push error for sub", sub.id, err?.message || err);
    }
  }

  // Mark queue item as sent if provided
  if (notificationId) {
    try {
      await supabase.from("notification_queue").update({ sent: true }).eq("id", notificationId);
    } catch (e) {
      console.warn("Failed to mark notification as sent:", e);
    }
  }

  return { sentCount, failedCount };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate VAPID
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "VAPID keys missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const contentType = req.headers.get("content-type") || "";
    let body: IncomingPayload | null = null;

    if (contentType.includes("application/json")) {
      try {
        body = await req.json();
      } catch (_) {
        body = null;
      }
    }

    // Mode 1: invoked by DB trigger with single payload
    if (body?.user_id && (body.title || body.body)) {
      const { sentCount, failedCount } = await sendToUser(
        body.user_id,
        {
          title: body.title || "LoveableConnect",
          body: body.body || "Hai una nuova notifica",
          data: body.data || { url: "/" },
        },
        body.notification_id
      );

      return new Response(
        JSON.stringify({ ok: true, sent: sentCount, failed: failedCount, mode: "single" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode 2: fallback batch processor (manual invocations)
    const { data: queue, error: qError } = await supabase
      .from("notification_queue")
      .select("id, user_id, title, body, data")
      .eq("sent", false)
      .order("created_at", { ascending: true })
      .limit(50);

    if (qError) throw qError;

    let totalSent = 0;
    let totalFailed = 0;

    for (const item of queue || []) {
      const { sentCount, failedCount } = await sendToUser(
        item.user_id,
        { title: item.title, body: item.body, data: item.data || { url: "/" } },
        item.id
      );
      totalSent += sentCount;
      totalFailed += failedCount;
    }

    return new Response(
      JSON.stringify({ ok: true, processed: (queue || []).length, sent: totalSent, failed: totalFailed, mode: "batch" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("send-push-notification error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
