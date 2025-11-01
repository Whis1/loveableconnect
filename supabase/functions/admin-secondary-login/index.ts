import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nickname, password } = await req.json();

    if (!nickname || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nickname e password sono richiesti' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Cerca l'account per nickname
    const { data: account, error: findError } = await supabase
      .from('admin_secondary_accounts')
      .select('id, nickname, password_hash, is_active')
      .eq('nickname', nickname)
      .maybeSingle();

    if (findError) {
      console.error('Errore ricerca account:', findError);
      return new Response(
        JSON.stringify({ success: false, error: 'Errore durante il login' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!account) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credenziali non valide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    if (!account.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Account disattivato' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verifica password
    const isPasswordValid = await bcrypt.compare(password, account.password_hash);

    if (!isPasswordValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credenziali non valide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Aggiorna ultimo login
    await supabase
      .from('admin_secondary_accounts')
      .update({ last_login: new Date().toISOString() })
      .eq('id', account.id);

    console.log(`Login secondario: ${nickname}`);

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          id: account.id,
          nickname: account.nickname,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Errore login secondario:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Errore durante il login' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
