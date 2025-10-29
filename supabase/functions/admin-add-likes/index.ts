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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { userId, likesAmount } = await req.json();

    if (!userId || likesAmount === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId e likesAmount sono richiesti' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Adding ${likesAmount} likes to user ${userId}`);

    // Get current likes
    const { data: currentData, error: fetchError } = await supabaseClient
      .from('user_credits')
      .select('daily_likes_remaining')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching current likes:', fetchError);
      throw new Error(`Errore nel recupero crediti: ${fetchError.message}`);
    }

    const newLikesRemaining = (currentData?.daily_likes_remaining || 0) + parseInt(likesAmount);

    // Update the likes
    const { error: updateError } = await supabaseClient
      .from('user_credits')
      .update({ 
        daily_likes_remaining: newLikesRemaining,
        daily_likes_reset_at: null // Reset the timer
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating likes:', updateError);
      throw new Error(`Errore nell'aggiornamento: ${updateError.message}`);
    }

    console.log(`Successfully added likes. New total: ${newLikesRemaining}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newLikesRemaining,
        message: `${likesAmount} like aggiunti con successo`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('admin-add-likes error:', error);
    const message = error instanceof Error ? error.message : 'Errore sconosciuto';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
