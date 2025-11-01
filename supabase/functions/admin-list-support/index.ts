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
    console.log('admin-list-support: Starting request');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: { userId?: string } = {};
    try {
      body = await req.json();
    } catch (_) {
      console.log('admin-list-support: No body or invalid JSON');
    }

    if (body.userId) {
      console.log('admin-list-support: Fetching messages for user', body.userId);
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', body.userId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) {
        console.error('admin-list-support: Error fetching user messages', error);
        throw error;
      }
      console.log('admin-list-support: Successfully fetched', data?.length || 0, 'messages');
      return new Response(JSON.stringify({ success: true, messages: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Recupera solo gli ultimi 50 messaggi per evitare timeout
    console.log('admin-list-support: Fetching all recent messages');
    const { data: messages, error } = await supabase
      .from('support_messages')
      .select('id, user_id, message, is_admin_response, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('admin-list-support: Error fetching messages', error);
      throw error;
    }
    console.log('admin-list-support: Fetched', messages?.length || 0, 'messages');

    // Recupera i nickname per gli user_id unici (massimo 20)
    const userIds = [...new Set((messages || []).map((m: any) => m.user_id).filter((id: any) => !!id))].slice(0, 20);
    console.log('admin-list-support: Found', userIds.length, 'unique user IDs');
    
    let profiles: any[] = [];
    if (userIds.length > 0) {
      console.log('admin-list-support: Fetching profiles');
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);
      
      if (profError) {
        console.error('admin-list-support: Error fetching profiles', profError);
      } else {
        profiles = profData || [];
        console.log('admin-list-support: Fetched', profiles.length, 'profiles');
      }
    }

    // Mappa i nickname ai messaggi
    const messagesWithNicknames = (messages || []).map((msg: any) => ({
      ...msg,
      profiles: profiles.find((p: any) => p.id === msg.user_id) || { nickname: 'N/A' }
    }));

    console.log('admin-list-support: Request completed successfully');
    return new Response(JSON.stringify({ success: true, messages: messagesWithNicknames }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('admin-list-support error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});