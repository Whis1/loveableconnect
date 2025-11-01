import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hash password usando Web Crypto API (supportato in Edge Functions)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const saltArray = Array.from(salt);
  
  // Combina salt e hash in un singolo string base64
  const combined = saltArray.concat(hashArray);
  return btoa(String.fromCharCode(...combined));
}

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
    const passwordHash = await hashPassword(password);

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
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
