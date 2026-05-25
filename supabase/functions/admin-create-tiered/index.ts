// Edge function: crea da zero un account admin tier 1 o 2.
//
// Flusso:
//   1) Verifica che il chiamante (Authorization header) sia admin tier 1
//   2) createUser via service role (email + password + email_confirm=true)
//   3) DELETE FROM profiles WHERE id=new_user_id → l'admin NON appare in bacheca
//   4) Mantiene user_credits (creato dal trigger) per evitare null reference
//   5) INSERT user_roles (role='admin', admin_tier=N)
//
// Ritorna { success, user_id, message } per il client.

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client con JWT dell'utente chiamante (per verifica ruolo)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: callerErr } = await supabaseUser.auth.getUser();
    if (callerErr || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sessione non valida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verifica che il chiamante sia admin tier 1
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('admin_tier')
      .eq('user_id', callerUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!callerRole || (callerRole as any).admin_tier !== 1) {
      return new Response(
        JSON.stringify({ success: false, error: 'Solo admin di tier 1 possono creare nuovi admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Body input
    const { email, password, tier } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email non valida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password troppo corta (min 6 caratteri)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (tier !== 1 && tier !== 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tier deve essere 1 o 2' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1) Crea auth user (email confermata automaticamente)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `Admin Tier ${tier}`,
        nickname: email.split('@')[0],
        is_admin_account: true,
      },
    });

    if (createErr || !created.user) {
      console.error('createUser error', createErr);
      return new Response(
        JSON.stringify({ success: false, error: createErr?.message ?? 'Errore creazione utente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = created.user.id;

    // 2) Elimina il profilo auto-generato dal trigger handle_new_user
    // così l'admin NON appare in bacheca / esplorazione / chat normale.
    const { error: delProfileErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', newUserId);
    if (delProfileErr) {
      console.warn('Profile delete warning (non bloccante):', delProfileErr);
    }

    // 3) Inserisce user_roles role='admin' con tier
    const { error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        { user_id: newUserId, role: 'admin', admin_tier: tier } as any,
        { onConflict: 'user_id,role' }
      );
    if (roleErr) {
      console.error('user_roles insert error', roleErr);
      // Rollback: cancella l'auth user appena creato
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ success: false, error: 'Errore assegnazione ruolo: ' + roleErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        email: email.trim().toLowerCase(),
        tier,
        message: `Account admin tier ${tier} creato con successo. Email: ${email}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('admin-create-tiered error', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message ?? 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
