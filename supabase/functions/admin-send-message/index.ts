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

    const { 
      match_id, 
      sender_id, 
      receiver_id, 
      content, 
      message_type = 'text', 
      media_url = null 
    } = await req.json();

    if (!match_id || !sender_id || !receiver_id || (!content && !media_url)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify sender is an admin profile
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('is_admin_profile')
      .eq('id', sender_id)
      .single();

    if (senderError || !senderProfile?.is_admin_profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sender must be an admin profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Insert message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id,
        sender_id,
        receiver_id,
        content,
        message_type,
        media_url,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (e) {
    console.error('admin-send-message error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});