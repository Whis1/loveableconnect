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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Non autenticato' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const adminId = authData.user.id;

    // Check admin role using DB function has_role
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: adminId,
      _role: 'admin',
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Permessi insufficienti' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { user_id, reason } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ success: false, error: 'user_id mancante' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // If already banned, return success
    const { data: existing, error: existingErr } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('banned_users')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existing) {
      return new Response(JSON.stringify({ success: true, alreadyBanned: true, ban: existing }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const svcClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: insertData, error } = await svcClient.from('banned_users').insert({
      user_id,
      banned_by: adminId,
      reason: reason || 'Ban amministrativo',
    }).select('*').single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, ban: insertData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('admin-ban-user error', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});