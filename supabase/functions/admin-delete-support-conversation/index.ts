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

    const { userId } = await req.json().catch(() => ({ userId: undefined }));
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing userId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ⭐ Prima di eliminare, raccogliamo i metadati per la richiesta di
    //    valutazione: email utente, admin che hanno scritto (nickname+email),
    //    data/orario dell'assistenza (ultimo messaggio).
    try {
      const { data: msgs } = await supabase
        .from('support_messages')
        .select('user_email, is_admin_response, admin_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (msgs && msgs.length > 0) {
        const userEmail = (msgs.find((m: any) => m.user_email)?.user_email) ?? null;
        const assistedAt = msgs[msgs.length - 1].created_at;
        const adminIds = Array.from(
          new Set(
            msgs.filter((m: any) => m.is_admin_response && m.admin_id).map((m: any) => m.admin_id)
          )
        ) as string[];

        // nickname dagli user_roles
        const nameMap: Record<string, string> = {};
        if (adminIds.length > 0) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('user_id, display_name')
            .in('user_id', adminIds);
          (roles ?? []).forEach((r: any) => {
            nameMap[r.user_id] = r.display_name || 'Admin';
          });
        }

        // email da auth.users
        const admins: { nickname: string; email: string | null }[] = [];
        for (const aid of adminIds) {
          let email: string | null = null;
          try {
            const { data: u } = await supabase.auth.admin.getUserById(aid);
            email = u?.user?.email ?? null;
          } catch (_) { /* ignore */ }
          admins.push({ nickname: nameMap[aid] || 'Admin', email });
        }

        await supabase.from('support_ratings').insert({
          user_id: userId,
          user_email: userEmail,
          admins,
          assisted_at: assistedAt,
          status: 'pending',
        });
      }
    } catch (ratingErr) {
      console.warn('Could not create support rating request:', ratingErr);
    }

    // Delete all support messages for this user
    const { error } = await supabase
      .from('support_messages')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('admin-delete-support-conversation error', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
