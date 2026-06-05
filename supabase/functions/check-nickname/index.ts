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
    const currentProfileId =
      typeof body?.current_profile_id === "string" && body.current_profile_id
        ? body.current_profile_id
        : null;

    if (!nickname) {
      return new Response(
        JSON.stringify({ taken: false, error: "Nickname mancante" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Case-insensitive, trimmed match (mirrors the unique index on lower(btrim(nickname))).
    // Compare against trim+lower of stored nickname to ignore leading/trailing spaces.
    let query = supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("nickname", nickname);

    if (currentProfileId) {
      query = query.neq("id", currentProfileId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error("Error checking nickname:", error);
      throw error;
    }

    const taken = !!data && data.length > 0;

    return new Response(
      JSON.stringify({ taken }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-nickname:", error);
    return new Response(
      JSON.stringify({ taken: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});