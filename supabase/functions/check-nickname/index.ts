import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawNickname = typeof body?.nickname === "string" ? body.nickname : "";
    const nickname = rawNickname.trim();

    if (!nickname) {
      return new Response(
        JSON.stringify({ available: false, error: "Nickname mancante" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Case-insensitive, trimmed match (mirrors the unique index on lower(btrim(nickname)))
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("nickname", nickname)
      .limit(1);

    if (error) {
      console.error("Error checking nickname:", error);
      throw error;
    }

    const available = !data || data.length === 0;

    return new Response(
      JSON.stringify({ available }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-nickname:", error);
    return new Response(
      JSON.stringify({ available: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});