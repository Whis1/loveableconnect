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

    const { userId, creditsAmount } = await req.json();

    if (!userId || !creditsAmount) {
      return new Response(
        JSON.stringify({ error: 'userId and creditsAmount are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Adding ${creditsAmount} credits to user: ${userId}`);

    // Check if user_credits record exists
    const { data: existingCredits, error: fetchError } = await supabaseAdmin
      .from('user_credits')
      .select('balance, user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching user credits:', fetchError);
      throw fetchError;
    }

    let newBalance: number;

    if (!existingCredits) {
      // Create new record with initial credits
      console.log('Creating new user_credits record');
      const { error: insertError } = await supabaseAdmin
        .from('user_credits')
        .insert({
          user_id: userId,
          balance: parseInt(creditsAmount),
          is_premium: false
        });

      if (insertError) {
        console.error('Error creating user credits:', insertError);
        throw insertError;
      }
      
      newBalance = parseInt(creditsAmount);
    } else {
      // Update existing record
      newBalance = existingCredits.balance + parseInt(creditsAmount);
      console.log(`Updating balance from ${existingCredits.balance} to ${newBalance}`);
      
      const { error: updateError } = await supabaseAdmin
        .from('user_credits')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user credits:', updateError);
        throw updateError;
      }
    }

    console.log('Credits added successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Added ${creditsAmount} credits`,
        newBalance 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in admin-add-credits function:', error);
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
