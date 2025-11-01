import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Conversation = {
  userId: string
  userNickname: string
  userAvatar: string | null
  adminProfileId: string
  adminNickname: string
  matchId: string
  lastMessageAt: string
  unreadCount: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get archived conversations
    const { data: archivedRows, error: archErr } = await supabase
      .from('admin_archived_conversations')
      .select('admin_profile_id, user_id')
    if (archErr) throw archErr

    const archivedSet = new Set<string>((archivedRows || []).map(r => `${r.admin_profile_id}-${r.user_id}`))

    // Get all admin profiles
    const { data: admins, error: adminsErr } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('is_admin_profile', true)
    if (adminsErr) throw adminsErr

    const userProfileCache = new Map<string, { nickname: string; avatar_url: string | null }>()
    const conversations: Conversation[] = []

    for (const admin of admins || []) {
      const adminId = admin.id as string

      // Matches involving this admin
      const { data: matches, error: matchesErr } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, created_at')
        .or(`user1_id.eq.${adminId},user2_id.eq.${adminId}`)
      if (matchesErr) throw matchesErr

      for (const m of matches || []) {
        const otherUserId = (m.user1_id === adminId ? m.user2_id : m.user1_id) as string
        if (!otherUserId) continue

        // Check if archived
        const isArchived = archivedSet.has(`${adminId}-${otherUserId}`)

        // Last message for this match
        const { data: lastMsg, error: lastErr } = await supabase
          .from('messages')
          .select('created_at')
          .eq('match_id', m.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (lastErr) throw lastErr
        
        const lastMessageAt = lastMsg?.created_at || (m as any).created_at

        // Unread count for admin
        const { count: unreadCount, error: cntErr } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', m.id)
          .eq('receiver_id', adminId)
          .eq('read', false)
        if (cntErr) throw cntErr
        // Skip archived conversations that have no unread messages (allow reappear on new messages)
        if (isArchived && (unreadCount || 0) === 0) continue

        // User profile (cache)
        if (!userProfileCache.has(otherUserId)) {
          const { data: uProf, error: uErr } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('id', otherUserId)
            .single()
          if (uErr) throw uErr
          userProfileCache.set(otherUserId, { nickname: uProf?.nickname || 'Utente', avatar_url: uProf?.avatar_url || null })
        }
        const u = userProfileCache.get(otherUserId)!

        conversations.push({
          userId: otherUserId,
          userNickname: u.nickname,
          userAvatar: u.avatar_url,
          adminProfileId: adminId,
          adminNickname: admin.nickname || 'Admin',
          matchId: m.id as string,
          lastMessageAt,
          unreadCount: unreadCount || 0,
        })
      }
    }

    conversations.sort((a: Conversation, b: Conversation) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

    console.log(`Conversazioni (messages) recuperate: ${conversations.length}`)

    return new Response(
      JSON.stringify({ success: true, conversations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Errore recupero conversazioni (messages):', error)
    const message = error instanceof Error ? error.message : 'Errore sconosciuto'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
