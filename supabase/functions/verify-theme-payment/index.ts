import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Service role: deve poter aggiornare profiles.owned_themes (no self-grant via RLS).
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user?.id) throw new Error("User not authenticated");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Session ID required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Sicurezza: la sessione deve appartenere a questo utente.
    if (session.metadata?.user_id && session.metadata.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Session does not belong to this user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, message: "Payment not completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const theme = session.metadata?.theme || "darkcrow";

    // Concedi il tema in modo IDEMPOTENTE: aggiungilo a owned_themes se manca.
    const { data: prof } = await supabase
      .from("profiles")
      .select("owned_themes")
      .eq("id", user.id)
      .maybeSingle();

    const current: string[] = ((prof as any)?.owned_themes ?? []) as string[];
    if (!current.includes(theme)) {
      // Primo acquisto: sblocca il tema E lo applica subito al profilo.
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ owned_themes: [...current, theme], profile_theme: theme })
        .eq("id", user.id);
      if (updErr) throw updErr;
    }

    return new Response(
      JSON.stringify({ success: true, theme, already_owned: current.includes(theme) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in verify-theme-payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
