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

    // Ottieni tutte le notifiche di tipo messaggio
    const { data: notifications, error: notifError } = await supabase
      .from('admin_notifications')
      .select('admin_profile_id, user_id, created_at')
      .eq('interaction_type', 'message')
      .order('created_at', { ascending: false });

    if (notifError) throw notifError;

    // Raggruppa per conversazioni uniche
    const uniqueConversations = new Map<string, any>();
    
    for (const notif of notifications || []) {
      const key = `${notif.admin_profile_id}-${notif.user_id}`;
      if (!uniqueConversations.has(key)) {
        uniqueConversations.set(key, notif);
      }
    }

    // Carica i dettagli di ogni conversazione
    const conversationsData = [];

    for (const notif of uniqueConversations.values()) {
      // Ottieni il match tra admin profile e user
      const { data: matches } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .or(`and(user1_id.eq.${notif.admin_profile_id},user2_id.eq.${notif.user_id}),and(user1_id.eq.${notif.user_id},user2_id.eq.${notif.admin_profile_id})`);

      if (!matches || matches.length === 0) continue;
      const match = matches[0];

      // Ottieni i profili
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('nickname, avatar_url')
        .eq('id', notif.user_id)
        .single();

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', notif.admin_profile_id)
        .single();

      // Conta messaggi non letti
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', match.id)
        .eq('receiver_id', notif.admin_profile_id)
        .eq('read', false);

      // Ottieni ultimo messaggio
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('match_id', match.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      conversationsData.push({
        userId: notif.user_id,
        userNickname: userProfile?.nickname || 'Utente',
        userAvatar: userProfile?.avatar_url || null,
        adminProfileId: notif.admin_profile_id,
        adminNickname: adminProfile?.nickname || 'Admin',
        matchId: match.id,
        lastMessageAt: lastMessage?.created_at || notif.created_at,
        unreadCount: count || 0,
      });
    }

    // Ordina per ultimo messaggio
    conversationsData.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    console.log(`Conversazioni recuperate: ${conversationsData.length}`);

    return new Response(
      JSON.stringify({ success: true, conversations: conversationsData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Errore recupero conversazioni:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
