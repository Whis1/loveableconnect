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

    // Validazione nickname: 3-30 caratteri, alfanumerici
    if (nickname.length < 3 || nickname.length > 30 || !/^[a-zA-Z0-9_]+$/.test(nickname)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Il nickname deve avere 3-30 caratteri e contenere solo lettere, numeri e underscore' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validazione password: minimo 6 caratteri
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'La password deve contenere almeno 6 caratteri' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verifica che il chiamante sia un admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorizzato' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorizzato' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verifica ruolo admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permessi insufficienti' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Hash della password
    const passwordHash = await bcrypt.hash(password);

    // Inserisci account
    const { data, error } = await supabase
      .from('admin_secondary_accounts')
      .insert({
        nickname,
        password_hash: passwordHash,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ success: false, error: 'Nickname già esistente' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      throw error;
    }

    console.log(`Account secondario creato: ${nickname} da ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, account: { id: data.id, nickname: data.nickname } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Errore creazione account secondario:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
