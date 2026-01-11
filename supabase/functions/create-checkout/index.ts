import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map plan_key to Stripe price IDs (LIVE)
const PLAN_PRICE_MAP: Record<string, string> = {
  solo: "price_1SoSGhRWPtpjyF4hTusfPPiG",      // The Investigator - $12/month
  team: "price_1SoSGsRWPtpjyF4hwra8HTaV",      // The Agency - $39/month
  enterprise: "price_1SoSH5RWPtpjyF4hXd6atI6G", // The Enterprise - $69/month
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
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

  // Service role client for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.json();
    const { priceId, planKey, organizationId } = body;
    
    logStep("Request received", { priceId, planKey, organizationId });

    // Determine the price ID to use
    let finalPriceId = priceId;
    
    // If planKey is provided, map it to a price ID
    if (planKey && !priceId) {
      finalPriceId = PLAN_PRICE_MAP[planKey];
      if (!finalPriceId) {
        throw new Error(`Invalid plan_key: ${planKey}`);
      }
      logStep("Mapped planKey to priceId", { planKey, finalPriceId });
    }
    
    if (!finalPriceId) {
      throw new Error("Price ID or Plan Key is required");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }
    
    const user = userData.user;
    if (!user.email) {
      throw new Error("User email not available");
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Verify organization ownership if organizationId provided
    let verifiedOrgId = organizationId;
    
    if (organizationId) {
      const { data: membership, error: memberError } = await supabaseAdmin
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .eq("role", "admin")
        .maybeSingle();
      
      if (memberError || !membership) {
        throw new Error("User is not an admin of this organization");
      }
      
      logStep("Organization membership verified", { organizationId, role: membership.role });
    } else {
      // Get user's first organization where they are admin
      const { data: membership, error: memberError } = await supabaseAdmin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      
      if (memberError || !membership) {
        logStep("No admin organization found", { error: memberError?.message });
        throw new Error("User does not have an organization");
      }
      
      verifiedOrgId = membership.organization_id;
      logStep("Using user's organization", { organizationId: verifiedOrgId });
    }

    // Get organization details
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, billing_email, stripe_customer_id")
      .eq("id", verifiedOrgId)
      .single();
    
    if (orgError || !org) {
      throw new Error("Organization not found");
    }
    
    logStep("Organization loaded", { orgId: org.id, name: org.name });

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    // Create or reuse Stripe Customer
    let customerId = org.stripe_customer_id;
    
    if (!customerId) {
      // Check if customer exists by email
      const customers = await stripe.customers.list({ 
        email: org.billing_email || user.email, 
        limit: 1 
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      } else {
        // Create new customer
        const newCustomer = await stripe.customers.create({
          email: org.billing_email || user.email,
          name: org.name,
          metadata: {
            organization_id: org.id,
            user_id: user.id,
          },
        });
        customerId = newCustomer.id;
        logStep("Created new Stripe customer", { customerId });
      }
      
      // Store customer ID in organization
      await supabaseAdmin
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", org.id);
      
      logStep("Updated organization with Stripe customer ID");
    } else {
      logStep("Using existing Stripe customer", { customerId });
    }

    // Determine the plan_key from the price
    let checkoutPlanKey = planKey;
    if (!checkoutPlanKey) {
      // Reverse lookup from price to plan key
      for (const [key, price] of Object.entries(PLAN_PRICE_MAP)) {
        if (price === finalPriceId) {
          checkoutPlanKey = key;
          break;
        }
      }
    }

    // Build success and cancel URLs
    const origin = req.headers.get("origin") || "https://app.casewyze.com";
    const successUrl = `${origin}/settings?tab=billing&success=true`;
    const cancelUrl = `${origin}/settings?tab=billing`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organization_id: org.id,
          plan_key: checkoutPlanKey || "solo",
        },
      },
      metadata: {
        organization_id: org.id,
        plan_key: checkoutPlanKey || "solo",
        user_id: user.id,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "required",
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url,
      planKey: checkoutPlanKey,
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error creating checkout session", { error: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
