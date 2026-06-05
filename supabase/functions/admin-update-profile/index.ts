import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate age from birthdate
function calculateAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { profileId, updates } = await req.json();

    if (!profileId || !updates) {
      return new Response(
        JSON.stringify({ error: 'profileId and updates are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Updating profile: ${profileId}`, updates);

    // If nickname is being changed, enforce case-insensitive, trimmed uniqueness
    // across ALL profiles (including admin profiles), excluding the current one.
    if (typeof updates.nickname === "string") {
      const trimmedNickname = updates.nickname.trim();
      // keep stored value trimmed to match the unique index on lower(btrim(nickname))
      updates.nickname = trimmedNickname;

      if (trimmedNickname) {
        const { data: existingNickname, error: nicknameError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .ilike("nickname", trimmedNickname.replace(/[\\%_]/g, "\\$&"))
          .neq("id", profileId)
          .limit(1);

        if (nicknameError) {
          console.error("Error checking nickname uniqueness:", nicknameError);
          throw nicknameError;
        }

        if (existingNickname && existingNickname.length > 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Nickname già utilizzato da un altro utente" }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
    }

    // If birthdate is provided, calculate and add age
    if (updates.birthdate) {
      updates.age = calculateAge(updates.birthdate);
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      throw error;
    }

    console.log('Update successful:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in admin-update-profile function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
