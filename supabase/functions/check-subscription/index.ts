import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Storage add-on product IDs
const STORAGE_ADDON_PRODUCT_IDS = [
  "prod_TagpgL61tfiDeS", // 500GB
  "prod_TagqN9os8BWfbU", // 1TB
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        product_id: null, 
        subscription_end: null,
        storage_addons: [] // Array of { product_id, quantity }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get ALL active subscriptions (to check for both main plan and storage add-ons)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20, // Get more to find all add-on subscriptions
    });

    let productId = null;
    let subscriptionEnd = null;
    let subscriptionId = null;
    let trialEnd = null;
    let status = "inactive";
    let hasActiveSub = false;
    
    // Track all storage add-ons with their quantities
    const storageAddons: Array<{ product_id: string; quantity: number }> = [];

    // Process all subscriptions
    for (const subscription of subscriptions.data) {
      const isActive = subscription.status === "active" || subscription.status === "trialing";
      
      if (!isActive) continue;

      // Check each item in the subscription
      for (const item of subscription.items?.data || []) {
        const itemProductId = item.price?.product as string;
        const quantity = item.quantity || 1;
        
        if (STORAGE_ADDON_PRODUCT_IDS.includes(itemProductId)) {
          // This is a storage add-on - add to array (supports multiple purchases)
          storageAddons.push({ product_id: itemProductId, quantity });
          logStep("Found storage add-on subscription", { productId: itemProductId, quantity });
        } else {
          // This is the main plan subscription
          hasActiveSub = true;
          productId = itemProductId;
          subscriptionId = subscription.id;
          status = subscription.status;
          
          if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
            subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
          }
          
          if (subscription.trial_end && typeof subscription.trial_end === 'number') {
            trialEnd = new Date(subscription.trial_end * 1000).toISOString();
          }
          
          logStep("Found main subscription", { 
            subscriptionId: subscription.id, 
            status: subscription.status,
            productId,
            endDate: subscriptionEnd,
            trialEnd 
          });
        }
      }
    }

    if (!hasActiveSub) {
      logStep("No active main subscription found");
    }

    logStep("Total storage add-ons found", { count: storageAddons.length, addons: storageAddons });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      subscription_id: subscriptionId,
      trial_end: trialEnd,
      status: status,
      storage_addons: storageAddons
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
