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

    // If birthdate is provided, calculate and add age
    if (updates.birthdate) {
      updates.age = calculateAge(updates.birthdate);
    }

    if (typeof updates.nickname === 'string') {
      const cleanNickname = normalizeNickname(updates.nickname);

      if (!cleanNickname) {
        return new Response(
          JSON.stringify({ success: false, error: 'Inserisci un nickname valido.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const { data: existingProfiles, error: nicknameCheckError } = await supabaseAdmin
        .from('profiles')
        .select('id, nickname')
        .ilike('nickname', escapeIlikePattern(cleanNickname))
        .limit(25);

      if (nicknameCheckError) {
        console.error('Nickname check error:', nicknameCheckError);
        throw nicknameCheckError;
      }

      const nicknameAlreadyExists = (existingProfiles ?? []).some((profile) =>
        profile.id !== profileId &&
        nicknameKey(profile.nickname) === nicknameKey(cleanNickname)
      );

      if (nicknameAlreadyExists) {
        return new Response(
          JSON.stringify({ success: false, error: NICKNAME_TAKEN_MESSAGE }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      updates.nickname = cleanNickname;
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
    if (isNicknameDuplicateError(error)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: NICKNAME_TAKEN_MESSAGE
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
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
