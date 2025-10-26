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

    // Auth client for verifying user
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ success: false, error: 'Non autenticato' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const adminId = authData.user.id;

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: adminId,
      _role: 'admin',
    });

    if (roleError || !isAdmin) {
      console.error('Role check error:', roleError, 'isAdmin:', isAdmin);
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
    const { data: existing, error: existingErr } = await supabase
      .from('banned_users')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingErr) {
      console.error('Error checking existing ban:', existingErr);
      throw existingErr;
    }
    if (existing) {
      return new Response(JSON.stringify({ success: true, alreadyBanned: true, ban: existing }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: insertData, error } = await supabase.from('banned_users').insert({
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