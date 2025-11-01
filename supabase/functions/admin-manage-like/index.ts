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

    const { action, fromUserId, toUserId } = await req.json();

    if (!action || !fromUserId || !toUserId) {
      return new Response(
        JSON.stringify({ error: 'action, fromUserId, and toUserId are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`${action} like: ${fromUserId} -> ${toUserId}`);

    if (action === 'add') {
      const { data, error } = await supabaseAdmin
        .from('likes')
        .insert({ from_user_id: fromUserId, to_user_id: toUserId })
        .select();

      if (error) {
        // Handle duplicate insert idempotently (unique_violation)
        if ((error as any).code === '23505') {
          console.warn('Duplicate like - already exists:', { fromUserId, toUserId });
          return new Response(
            JSON.stringify({ success: true, already_liked: true }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          );
        }
        console.error('Insert error:', error);
        throw error;
      }

      // Check if like was created or if a match was created instead (trigger deleted the like)
      if (data && data.length > 0) {
        console.log('Like added:', data[0]);
        return new Response(
          JSON.stringify({ success: true, data: data[0] }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      } else {
        // Like was inserted but immediately deleted by trigger (match created)
        console.log('Match created - like was consumed by trigger');
        return new Response(
          JSON.stringify({ success: true, match_created: true }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    } else if (action === 'remove') {
      const { error } = await supabaseAdmin
        .from('likes')
        .delete()
        .eq('from_user_id', fromUserId)
        .eq('to_user_id', toUserId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Like removed');

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "add" or "remove"' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error in admin-manage-like function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
