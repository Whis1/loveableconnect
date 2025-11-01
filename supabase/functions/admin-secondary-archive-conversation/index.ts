import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ArchiveBody {
  adminProfileId?: string
  userId?: string
  matchId?: string
  action?: 'archive' | 'unarchive'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = (await req.json().catch(() => ({}))) as ArchiveBody
    const { adminProfileId, userId, matchId, action = 'archive' } = body

    if (!adminProfileId || (!userId && !matchId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing adminProfileId and userId or matchId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let resolvedUserId = userId
    let resolvedMatchId = matchId

    // Resolve match or user if one is missing
    if (!resolvedMatchId) {
      // Find match between admin and user
      const { data: matches, error: matchErr } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .or(`and(user1_id.eq.${adminProfileId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${adminProfileId})`)

      if (matchErr) throw matchErr
      if (!matches || matches.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Match not found for admin/user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }
      resolvedMatchId = matches[0].id
    }

    if (!resolvedUserId) {
      // Resolve user from match
      const { data: match, error: mErr } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .eq('id', resolvedMatchId!)
        .single()
      if (mErr) throw mErr
      resolvedUserId = match!.user1_id === adminProfileId ? match!.user2_id : match!.user1_id
    }

    if (action === 'archive') {
      const { error: upErr } = await supabase
        .from('admin_archived_conversations')
        .upsert(
          {
            admin_profile_id: adminProfileId,
            user_id: resolvedUserId!,
            match_id: resolvedMatchId!,
            archived_at: new Date().toISOString(),
          },
          { onConflict: 'admin_profile_id,user_id' }
        )
      if (upErr) throw upErr
      return new Response(
        JSON.stringify({ success: true, action: 'archived' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      const { error: delErr } = await supabase
        .from('admin_archived_conversations')
        .delete()
        .match({ admin_profile_id: adminProfileId, user_id: resolvedUserId! })
      if (delErr) throw delErr
      return new Response(
        JSON.stringify({ success: true, action: 'unarchived' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
  } catch (error) {
    console.error('Errore archivio conversazione:', error)
    const message = error instanceof Error ? error.message : 'Errore sconosciuto'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
