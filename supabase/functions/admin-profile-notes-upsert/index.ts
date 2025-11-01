import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { profile_id, admin_profile_id, match_id, field, value } = await req.json();
    
    if (!profile_id || !admin_profile_id || !match_id || !field) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Upsert (insert or update) sulla tripla admin_profile_id + profile_id + match_id
    const { data, error } = await supabase
      .from('profile_notes')
      .upsert(
        { profile_id, admin_profile_id, match_id, [field]: value },
        { onConflict: 'profile_id,admin_profile_id,match_id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, notes: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (e) {
    console.error('admin-profile-notes-upsert error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});