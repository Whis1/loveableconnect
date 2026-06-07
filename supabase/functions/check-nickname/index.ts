import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeNickname = (value: string | null | undefined): string => (value ?? "").trim();

const nicknameKey = (value: string | null | undefined): string =>
  normalizeNickname(value).toLocaleLowerCase("it-IT");

const escapeIlikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nickname, current_profile_id } = await req.json().catch(() => ({}));
    const normalized = normalizeNickname(nickname);

    if (!normalized) {
      return new Response(
        JSON.stringify({ taken: false }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, nickname")
      .ilike("nickname", escapeIlikePattern(normalized))
      .limit(25);

    if (error) throw error;

    const wantedKey = nicknameKey(normalized);
    const taken = (data ?? []).some((profile) =>
      profile.id !== current_profile_id &&
      nicknameKey(profile.nickname) === wantedKey
    );

    return new Response(
      JSON.stringify({ taken }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("check-nickname error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
