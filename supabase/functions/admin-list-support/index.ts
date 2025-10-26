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
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, messages: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Recupera solo gli ultimi 200 messaggi per evitare timeout
    const { data: messages, error } = await supabase
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    // Recupera i nickname per gli user_id unici (se presenti)
    const userIds = [...new Set((messages || []).map((m: any) => m.user_id).filter((id: any) => !!id))];
    let profiles: any[] = [];
    if (userIds.length > 0 && userIds.length < 100) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);
      profiles = profData || [];
    }

    // Mappa i nickname ai messaggi
    const messagesWithNicknames = (messages || []).map((msg: any) => ({
      ...msg,
      profiles: profiles.find((p: any) => p.id === msg.user_id) || { nickname: 'N/A' }
    }));

    return new Response(JSON.stringify({ success: true, messages: messagesWithNicknames }), {
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