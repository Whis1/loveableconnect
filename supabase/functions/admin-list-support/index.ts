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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: { userId?: string } = {};
    try {
      body = await req.json();
    } catch (_) {}

    if (body.userId) {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', body.userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, messages: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data, error } = await supabase
      .from('support_messages')
      .select(`
        *,
        profiles:user_id (nickname)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, messages: data || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('admin-list-support error', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});