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

    const { userId, requestId } = await req.json();

    if (!userId || !requestId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing userId or requestId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Deleting account for user:', userId);

    // 1. Update the support request status to approved
    const { error: updateError } = await supabase
      .from('support_messages')
      .update({ request_status: 'approved' })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating support request:', updateError);
      throw updateError;
    }

    // 2. Delete user data from all tables (cascading deletes should handle most)
    // Delete from various tables if needed (most should cascade from RLS policies)
    
    // 3. Delete the profile (this should cascade to most related data)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      throw profileError;
    }

    // 4. Delete the auth user (this is the final step)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      throw authError;
    }

    console.log('Account deleted successfully for user:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('admin-delete-account error', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
