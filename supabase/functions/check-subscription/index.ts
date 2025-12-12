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

// Storage add-on product IDs
const STORAGE_ADDON_PRODUCT_IDS = [
  "prod_TagpgL61tfiDeS", // 500GB Storage
  "prod_TagqN9os8BWfbU", // 1TB Storage
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
        storage_addon_product_id: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get ALL active subscriptions (to find both main plan and add-ons)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10, // Increased to capture all subscriptions including add-ons
    });

    // Filter for active/trialing subscriptions
    const activeSubscriptions = subscriptions.data.filter(
      (sub: { status: string }) => sub.status === "active" || sub.status === "trialing"
    );
    
    logStep("Found subscriptions", { 
      total: subscriptions.data.length, 
      active: activeSubscriptions.length 
    });

    let mainPlanProductId: string | null = null;
    let storageAddonProductId: string | null = null;
    let subscriptionEnd: string | null = null;
    let subscriptionId: string | null = null;
    let trialEnd: string | null = null;
    let status = "inactive";

    // Process each active subscription
    for (const subscription of activeSubscriptions) {
      for (const item of subscription.items.data) {
        const productId = item.price.product as string;
        
        // Check if this is a main plan
        if (MAIN_PLAN_PRODUCT_IDS.includes(productId)) {
          mainPlanProductId = productId;
          subscriptionId = subscription.id;
          status = subscription.status;
          
          if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
            subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
          }
          
          if (subscription.trial_end && typeof subscription.trial_end === 'number') {
            trialEnd = new Date(subscription.trial_end * 1000).toISOString();
          }
          
          logStep("Found main plan subscription", { 
            productId, 
            subscriptionId: subscription.id,
            status: subscription.status 
          });
        }
        
        // Check if this is a storage add-on
        if (STORAGE_ADDON_PRODUCT_IDS.includes(productId)) {
          storageAddonProductId = productId;
          logStep("Found storage add-on subscription", { productId });
        }
      }
    }

    const hasActiveSub = mainPlanProductId !== null;

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: mainPlanProductId,
      subscription_end: subscriptionEnd,
      subscription_id: subscriptionId,
      trial_end: trialEnd,
      status: hasActiveSub ? status : "inactive",
      storage_addon_product_id: storageAddonProductId,
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
