// Edge function admin: reset di un account a stato free + diagnostica.
//
// Endpoints (selezionati via body.action):
//   action = "diagnose": ritorna lo stato attuale di user_credits + tris_games
//                        per il userId, senza modificarlo.
//   action = "reset":    azzera l'abbonamento e il counter tris/dama:
//                        - user_credits: is_premium=false, subscription_type='none',
//                          premium_tier='none', premium_expires_at=null
//                        - tris_games: games_played_today=0, last_reset_date=oggi
//
// Usa service role per bypassare le RLS che bloccavano l'UPDATE
// client-side su user_credits (il reset dall'admin panel non aveva effetto).

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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const userId: string | undefined = body?.userId;
    const action: string = body?.action ?? 'diagnose';

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'diagnose') {
      console.log(`[diagnose] userId=${userId}`);

      const { data: credits, error: creditsErr } = await supabaseAdmin
        .from('user_credits')
        .select('user_id, balance, is_premium, subscription_type, premium_tier, premium_expires_at, daily_likes_remaining, last_daily_reset')
        .eq('user_id', userId)
        .maybeSingle();

      if (creditsErr) {
        console.error('credits fetch error', creditsErr);
        throw creditsErr;
      }

      const { data: trisGames, error: trisErr } = await supabaseAdmin
        .from('tris_games')
        .select('user_id, games_played_today, last_reset_date')
        .eq('user_id', userId)
        .maybeSingle();

      if (trisErr) {
        console.error('tris_games fetch error', trisErr);
        throw trisErr;
      }

      // Calcoliamo cosa direbbe la logica client-side hasUnlimitedGames():
      const now = new Date();
      const hasActiveSub = Boolean(
        credits?.is_premium &&
          ((!credits.premium_expires_at && (credits.subscription_type === 'monthly' || credits.subscription_type === 'weekly')) ||
            (credits.premium_expires_at && new Date(credits.premium_expires_at) > now))
      );
      const hasUnlimited = Boolean(
        hasActiveSub &&
          credits?.subscription_type === 'monthly' &&
          (!credits.premium_tier || credits.premium_tier === 'premium')
      );

      return new Response(
        JSON.stringify({
          success: true,
          action: 'diagnose',
          userCredits: credits ?? null,
          trisGames: trisGames ?? null,
          computed: {
            hasActiveSubscription: hasActiveSub,
            hasUnlimitedGames: hasUnlimited,
            now: now.toISOString(),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'reset') {
      console.log(`[reset] userId=${userId}`);

      // 1) Reset user_credits
      const { data: updatedCredits, error: updateErr } = await supabaseAdmin
        .from('user_credits')
        .update({
          is_premium: false,
          subscription_type: 'none',
          premium_tier: 'none',
          premium_expires_at: null,
        })
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (updateErr) {
        console.error('user_credits update error', updateErr);
        throw updateErr;
      }

      // Se non esiste la riga la creiamo
      if (!updatedCredits) {
        const { error: insertErr } = await supabaseAdmin
          .from('user_credits')
          .insert({
            user_id: userId,
            balance: 26,
            is_premium: false,
            subscription_type: 'none',
            premium_tier: 'none',
            premium_expires_at: null,
          });
        if (insertErr) {
          console.error('user_credits insert error', insertErr);
          throw insertErr;
        }
      }

      // 2) Reset tris_games (oggi a 0)
      const today = new Date().toISOString().split('T')[0];
      const { data: existingTris } = await supabaseAdmin
        .from('tris_games')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingTris) {
        const { error: trisUpdateErr } = await supabaseAdmin
          .from('tris_games')
          .update({ games_played_today: 0, last_reset_date: today })
          .eq('user_id', userId);
        if (trisUpdateErr) {
          console.error('tris_games update error', trisUpdateErr);
          throw trisUpdateErr;
        }
      } else {
        const { error: trisInsertErr } = await supabaseAdmin
          .from('tris_games')
          .insert({ user_id: userId, games_played_today: 0, last_reset_date: today });
        if (trisInsertErr) {
          console.error('tris_games insert error', trisInsertErr);
          throw trisInsertErr;
        }
      }

      // 3) Ritorna lo stato finale
      const { data: finalCredits } = await supabaseAdmin
        .from('user_credits')
        .select('user_id, balance, is_premium, subscription_type, premium_tier, premium_expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: finalTris } = await supabaseAdmin
        .from('tris_games')
        .select('user_id, games_played_today, last_reset_date')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('[reset] done', { finalCredits, finalTris });

      return new Response(
        JSON.stringify({
          success: true,
          action: 'reset',
          userCredits: finalCredits ?? null,
          trisGames: finalTris ?? null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('admin-reset-account error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
