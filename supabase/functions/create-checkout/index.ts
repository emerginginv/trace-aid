import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Storage add-on product IDs
const STORAGE_ADDON_PRODUCT_IDS = [
  "prod_TagpgL61tfiDeS", // 500GB Storage Add-on
  "prod_TagqN9os8BWfbU", // 1TB Storage Add-on
];

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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
    const { priceId } = await req.json();
    
    if (!priceId) {
      throw new Error("Price ID is required");
    }
    logStep("Request received", { priceId });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    
    // Get the price to check what product it's for
    const price = await stripe.prices.retrieve(priceId);
    const productId = typeof price.product === 'string' ? price.product : price.product.id;
    const isStorageAddon = STORAGE_ADDON_PRODUCT_IDS.includes(productId);
    logStep("Price retrieved", { productId, isStorageAddon });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Check for existing main subscription (non-storage-addon)
    let existingMainSubscription: Stripe.Subscription | null = null;
    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
      });
      
      // Find the main subscription (not a storage addon)
      for (const sub of subscriptions.data) {
        const subProductId = sub.items.data[0]?.price?.product;
        const subProductIdStr = typeof subProductId === 'string' ? subProductId : subProductId?.id;
        if (subProductIdStr && !STORAGE_ADDON_PRODUCT_IDS.includes(subProductIdStr)) {
          existingMainSubscription = sub;
          logStep("Found existing main subscription", { subscriptionId: sub.id, productId: subProductIdStr });
          break;
        }
      }
    }

    // If user has an existing main subscription and is trying to change to a different main plan
    if (existingMainSubscription && !isStorageAddon) {
      const currentProductId = existingMainSubscription.items.data[0]?.price?.product;
      const currentProductIdStr = typeof currentProductId === 'string' ? currentProductId : currentProductId?.id;
      
      if (currentProductIdStr !== productId) {
        logStep("Upgrading/Downgrading subscription", { from: currentProductIdStr, to: productId });
        
        // Update the existing subscription to the new price
        const updatedSubscription = await stripe.subscriptions.update(existingMainSubscription.id, {
          items: [
            {
              id: existingMainSubscription.items.data[0].id,
              price: priceId,
            },
          ],
          proration_behavior: 'create_prorations',
        });
        
        logStep("Subscription updated successfully", { subscriptionId: updatedSubscription.id });
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Subscription updated successfully",
          subscriptionId: updatedSubscription.id 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        logStep("Already on this plan");
        return new Response(JSON.stringify({ 
          success: false, 
          message: "You are already on this plan" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // For new subscriptions or storage add-ons, create a checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/settings?tab=billing&success=true`,
      cancel_url: `${req.headers.get("origin")}/settings?tab=billing`,
    };

    // Only add trial for main plans (not storage addons) and new customers
    if (!isStorageAddon && !existingMainSubscription) {
      sessionConfig.subscription_data = {
        trial_period_days: 14,
      };
    }

    logStep("Creating checkout session", { isStorageAddon, hasExistingSubscription: !!existingMainSubscription });
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
