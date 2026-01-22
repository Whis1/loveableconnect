 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   const supabaseClient = createClient(
     Deno.env.get("SUPABASE_URL") ?? "",
     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
   );
 
   try {
     console.log("Starting daily games reset...");
 
     const today = new Date().toISOString().split("T")[0];
     
     // Reset all users with old last_reset_date
     const { data, error } = await supabaseClient
       .from("tris_games")
       .update({ 
         games_played_today: 0,
         last_reset_date: today 
       })
       .lt("last_reset_date", today)
       .select();
 
     if (error) throw error;
 
     console.log(`Daily games reset completed. ${data?.length || 0} users reset.`);
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         users_reset: data?.length || 0,
         reset_date: today,
         timestamp: new Date().toISOString()
       }),
       {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 200,
       }
     );
   } catch (error) {
     console.error("Error in reset-daily-games:", error);
     const errorMessage = error instanceof Error ? error.message : "Unknown error";
     return new Response(JSON.stringify({ error: errorMessage }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
       status: 500,
     });
   }
 });