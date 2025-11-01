import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verifica password usando Web Crypto API (supportato in Edge Functions)
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Decodifica hash base64
    const combined = atob(storedHash);
    const combinedArray = Array.from(combined).map(c => c.charCodeAt(0));
    
    // Estrai salt (primi 16 bytes) e hash (resto)
    const salt = new Uint8Array(combinedArray.slice(0, 16));
    const storedHashArray = combinedArray.slice(16);
    
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
    
    // Confronto costante nel tempo
    if (hashArray.length !== storedHashArray.length) return false;
    
    let diff = 0;
    for (let i = 0; i < hashArray.length; i++) {
      diff |= hashArray[i] ^ storedHashArray[i];
    }
    
    return diff === 0;
  } catch (error) {
    console.error('Errore verifica password:', error);
    return false;
  }
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Verifica password
    const isPasswordValid = await verifyPassword(password, account.password_hash);

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
