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

// Main plan product IDs
const MAIN_PLAN_PRODUCT_IDS = [
  "prod_TagUwxglXyq7Ls", // The Investigator
  "prod_TagbsPhNweUFpe", // The Agency
  "prod_Tagc0lPxc1XjVC", // The Enterprise
];

// Storage add-on product IDs with their storage values
const STORAGE_ADDON_PRODUCT_IDS: Record<string, number> = {
  "prod_TagpgL61tfiDeS": 500,  // 500GB Storage Add-on
  "prod_TagqN9os8BWfbU": 1000, // 1TB Storage Add-on
};

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
        storage_addon_gb: 0,
        storage_addon_ids: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get ALL active/trialing subscriptions (not just limit 1)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100, // Get all subscriptions
    });

    let mainProductId = null;
    let subscriptionEnd = null;
    let subscriptionId = null;
    let trialEnd = null;
    let status = "inactive";
    let hasActiveMainSub = false;
    let storageAddonGb = 0;
    const storageAddonIds: string[] = [];

    // Process all subscriptions
    for (const subscription of subscriptions.data) {
      const isActiveOrTrialing = subscription.status === "active" || subscription.status === "trialing";
      
      if (!isActiveOrTrialing) continue;

      for (const item of subscription.items.data) {
        const productId = item.price.product as string;
        
        // Check if this is a main plan
        if (MAIN_PLAN_PRODUCT_IDS.includes(productId)) {
          if (!hasActiveMainSub) {
            hasActiveMainSub = true;
            mainProductId = productId;
            subscriptionId = subscription.id;
            status = subscription.status;
            
            if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
              subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
            }
            
            if (subscription.trial_end && typeof subscription.trial_end === 'number') {
              trialEnd = new Date(subscription.trial_end * 1000).toISOString();
            }
            
            logStep("Found main subscription", { 
              productId, 
              subscriptionId: subscription.id, 
              status: subscription.status 
            });
          }
        }
        
        // Check if this is a storage add-on
        if (STORAGE_ADDON_PRODUCT_IDS[productId]) {
          // Add storage for each quantity of the add-on
          const quantity = item.quantity || 1;
          const addonStorage = STORAGE_ADDON_PRODUCT_IDS[productId] * quantity;
          storageAddonGb += addonStorage;
          storageAddonIds.push(productId);
          
          logStep("Found storage add-on", { 
            productId, 
            quantity,
            storageGb: addonStorage,
            totalAddonGb: storageAddonGb 
          });
        }
      }
    }

    logStep("Subscription check complete", { 
      hasActiveMainSub, 
      mainProductId, 
      storageAddonGb,
      storageAddonCount: storageAddonIds.length
    });

    return new Response(JSON.stringify({
      subscribed: hasActiveMainSub,
      product_id: mainProductId,
      subscription_end: subscriptionEnd,
      subscription_id: subscriptionId,
      trial_end: trialEnd,
      status: status,
      storage_addon_gb: storageAddonGb,
      storage_addon_ids: storageAddonIds
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
