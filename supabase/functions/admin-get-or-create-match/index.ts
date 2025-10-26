import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const { adminProfileId, userId } = await req.json()

    if (!adminProfileId || !userId) {
      return new Response(
        JSON.stringify({ error: 'adminProfileId and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify that adminProfileId is actually an admin
    const { data: adminProfile, error: adminError } = await supabaseClient
      .from('profiles')
      .select('is_admin_profile')
      .eq('id', adminProfileId)
      .single()

    if (adminError || !adminProfile?.is_admin_profile) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Not an admin profile' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find or create match
    const user1 = adminProfileId < userId ? adminProfileId : userId
    const user2 = adminProfileId < userId ? userId : adminProfileId

    let { data: existingMatch } = await supabaseClient
      .from('matches')
      .select('id')
      .eq('user1_id', user1)
      .eq('user2_id', user2)
      .maybeSingle()

    if (!existingMatch) {
      const { data: newMatch, error: matchError } = await supabaseClient
        .from('matches')
        .insert({ user1_id: user1, user2_id: user2 })
        .select('id')
        .single()

      if (matchError) {
        console.error('Error creating match:', matchError)
        throw matchError
      }
      existingMatch = newMatch
    }

    return new Response(
      JSON.stringify({ success: true, match_id: existingMatch.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in admin-get-or-create-match:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
