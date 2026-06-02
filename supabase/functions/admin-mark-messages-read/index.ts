import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({})) as { match_id?: string; admin_profile_id?: string; user_id?: string }
    const matchId = body.match_id
    const adminProfileId = body.admin_profile_id
    const userId = body.user_id

    if (!matchId) {
      return new Response(
        JSON.stringify({ success: false, error: 'match_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Segna come letti i messaggi NON letti in arrivo per l'admin.
    // Criterio principale: i messaggi inviati dall'utente reale (sender_id =
    // user_id). E' coerente con il conteggio in admin-secondary-get-conversations
    // e robusto anche se il receiver_id fosse impostato in modo anomalo.
    // Se user_id non e' disponibile, ripieghiamo sul receiver_id dell'admin.
    let query = supabase
      .from('messages')
      .update({ read: true }, { count: 'exact' })
      .eq('match_id', matchId)
      .eq('read', false)

    if (userId) {
      query = query.eq('sender_id', userId)
    } else if (adminProfileId) {
      query = query.eq('receiver_id', adminProfileId)
    }

    const { error, count } = await query

    if (error) throw error

    console.log(`Marked ${count ?? 0} messages as read for match ${matchId} (user ${userId ?? '-'}, admin ${adminProfileId ?? '-'})`)

    return new Response(
      JSON.stringify({ success: true, updated: count ?? 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('admin-mark-messages-read error', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
