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

    const body = await req.json();
    let { 
      match_id, 
      sender_id, 
      receiver_id, 
      content, 
      message_type = 'text', 
      media_url = null 
    } = body || {};

    // Normalize inputs
    const sMatchId = typeof match_id === 'string' ? match_id.trim() : '';
    const sSenderId = typeof sender_id === 'string' ? sender_id.trim() : '';
    const sReceiverId = typeof receiver_id === 'string' ? receiver_id.trim() : '';
    const sContent = typeof content === 'string' ? content.trim() : '';
    const sMediaUrl = typeof media_url === 'string' ? media_url.trim() : '';

    if (!sMatchId || !sSenderId || !sReceiverId || (!sContent && !sMediaUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify sender is an admin profile and get nickname
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('is_admin_profile, nickname')
      .eq('id', sSenderId)
      .single();

    if (senderError || !senderProfile?.is_admin_profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sender must be an admin profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Insert message with admin nickname
    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: sMatchId,
        sender_id: sSenderId,
        receiver_id: sReceiverId,
        content: sContent || '',
        message_type,
        media_url: sMediaUrl || null,
        admin_sender_nickname: senderProfile.nickname,
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