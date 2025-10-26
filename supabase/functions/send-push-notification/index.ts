import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// VAPID configuration (you'll need to generate your own keys with web-push npm package)
// For now using placeholder - in production: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE_KEY = "your-private-key-here"; // Store in Supabase secrets

interface NotificationPayload {
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("🔔 Starting push notification processor...");

    // Get all unsent notifications
    const { data: notifications, error: fetchError } = await supabaseClient
      .from("notification_queue")
      .select("*")
      .eq("sent", false)
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error("Error fetching notifications:", fetchError);
      throw fetchError;
    }

    if (!notifications || notifications.length === 0) {
      console.log("No notifications to send");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${notifications.length} notifications to send`);

    let sentCount = 0;
    let failedCount = 0;

    // Process each notification
    for (const notification of notifications) {
      try {
        // Get user's push subscriptions
        const { data: subscriptions } = await supabaseClient
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", notification.user_id);

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No subscriptions found for user ${notification.user_id}`);
          // Mark as sent even if no subscriptions (avoid retry loop)
          await supabaseClient
            .from("notification_queue")
            .update({ sent: true })
            .eq("id", notification.id);
          continue;
        }

        console.log(`Sending to ${subscriptions.length} subscription(s) for user ${notification.user_id}`);

        // Send to each subscription
        for (const subscription of subscriptions) {
          try {
            const payload: NotificationPayload = {
              title: notification.title,
              body: notification.body,
              type: notification.type,
              data: notification.data
            };

            // Here you would use web-push library to send the notification
            // For now, we'll use a simplified approach with fetch
            // In production, use web-push npm package or a service like OneSignal

            console.log(`Sending notification to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
            
            // This is a placeholder - in production you need web-push library
            // or a push notification service to properly sign and send
            const pushResponse = await fetch(subscription.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'TTL': '86400' // 24 hours
              },
              body: JSON.stringify(payload)
            });

            if (!pushResponse.ok) {
              console.error(`Failed to send push: ${pushResponse.status} ${pushResponse.statusText}`);
              
              // If subscription is no longer valid, remove it
              if (pushResponse.status === 410 || pushResponse.status === 404) {
                await supabaseClient
                  .from("push_subscriptions")
                  .delete()
                  .eq("id", subscription.id);
                console.log(`Removed invalid subscription ${subscription.id}`);
              }
            } else {
              console.log(`✅ Notification sent successfully`);
              sentCount++;
            }

          } catch (pushError) {
            console.error(`Error sending to subscription ${subscription.id}:`, pushError);
            failedCount++;
          }
        }

        // Mark notification as sent
        await supabaseClient
          .from("notification_queue")
          .update({ sent: true })
          .eq("id", notification.id);

      } catch (notificationError) {
        console.error(`Error processing notification ${notification.id}:`, notificationError);
        failedCount++;
      }
    }

    console.log(`✅ Push notification processor completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        sent: sentCount,
        failed: failedCount,
        processed: notifications.length
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});