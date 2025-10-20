import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: { filter?: 'all' | 'unread' } = {};
    try { body = await req.json(); } catch (_) {}

    let query = supabase
      .from('admin_notifications')
      .select(`
        *,
        user_profile:user_id(nickname, avatar_url),
        admin_profile:admin_profile_id(nickname)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (body.filter === 'unread') {
      query = query.eq('read', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, notifications: data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (e) {
    console.error('admin-list-notifications error', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});