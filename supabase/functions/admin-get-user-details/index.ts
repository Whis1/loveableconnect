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

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (profileError) throw profileError;

    // Get user credits and subscription info
    const { data: credits, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') throw creditsError;

    // Get purchase history (crediti normali + abbonamenti)
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (purchasesError) throw purchasesError;

    // Acquisti di crediti-regalo della chat (portafoglio in euro separato).
    // La tabella salva solo i crediti (non l'importo): l'euro si ricava dai
    // pacchetti noti (25cr = 4,99€, 100cr = 19,99€). Le righe qui presenti
    // sono sempre pagamenti andati a buon fine.
    const { data: giftPurchases, error: giftError } = await supabase
      .from('gift_credit_purchases')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (giftError) throw giftError;

    const giftCentsFromCredits = (c: number) =>
      c === 25 ? 499 : c === 100 ? 1999 : 0;

    const giftRows = (giftPurchases || []).map((g: any) => ({
      id: `gift_${g.session_id}`,
      product_type: 'gift_credits',
      credits_amount: g.credits,
      amount_cents: giftCentsFromCredits(g.credits),
      currency: 'eur',
      status: 'completed',
      created_at: g.created_at,
      completed_at: g.created_at,
    }));

    // Unione crediti/abbonamenti + regali, ordinata dal piu' recente.
    const allPurchases = [...(purchases || []), ...giftRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Get auth user data for registration date
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
    if (authError) throw authError;

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        credits: credits || null,
        purchases: allPurchases,
        auth_created_at: authUser.user.created_at,
        auth_last_sign_in_at: authUser.user.last_sign_in_at || null,
        auth_provider: authUser.user.app_metadata.provider || 'email',
        auth_email: authUser.user.email || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('admin-get-user-details error', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
