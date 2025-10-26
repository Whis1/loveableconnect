import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verifica chiave segreta temporanea (solo per setup iniziale)
    const { secret } = await req.json();
    if (secret !== "setup-admin-2025") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Credenziali admin dedicate
    const adminEmail = "admin@loveableconnect.internal";
    const adminPassword = "LovConnect2025!Admin#Secure";

    // Crea l'utente admin
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Sistema Admin",
        nickname: "admin",
      }
    });

    if (userError) {
      // Se l'utente esiste già, prova a recuperarlo
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(u => u.email === adminEmail);
      
      if (existingUser) {
        // Assicurati che abbia il ruolo admin
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert({
            user_id: existingUser.id,
            role: "admin"
          }, {
            onConflict: "user_id,role"
          });

        if (roleError) throw roleError;

        return new Response(
          JSON.stringify({
            success: true,
            message: "Account admin già esistente, ruolo verificato",
            credentials: {
              email: adminEmail,
              password: "Password esistente"
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw userError;
    }

    // Assegna il ruolo admin
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userData.user.id,
        role: "admin"
      });

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account admin creato con successo",
        credentials: {
          email: adminEmail,
          password: adminPassword
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error creating admin account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
