import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Map Stripe product IDs to plan keys
const PLAN_KEY_MAP: Record<string, string> = {
  "prod_TagUwxglXyq7Ls": "solo",
  "prod_TagbsPhNweUFpe": "team",
  "prod_Tagc0lPxc1XjVC": "enterprise",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecretKey || !webhookSecret) {
    logStep("ERROR: Missing Stripe configuration");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: Missing Stripe signature");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get raw body for signature verification
    const body = await req.text();
    
    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logStep("ERROR: Signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Webhook received", { type: event.type, id: event.id });

    // Check idempotency - skip if event already processed
    const { data: existingEvent } = await supabaseAdmin
      .from("billing_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription 
        });

        const organizationId = session.metadata?.organization_id;
        const planKey = session.metadata?.plan_key || "solo";

        if (!organizationId) {
          logStep("ERROR: No organization_id in metadata");
          break;
        }

        // Update organization with subscription details
        const { error: updateError } = await supabaseAdmin
          .from("organizations")
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: "active",
            plan_key: planKey,
          })
          .eq("id", organizationId);

        if (updateError) {
          logStep("ERROR: Failed to update organization", { error: updateError });
        } else {
          logStep("Organization activated", { organizationId, planKey });
        }

        // Log billing event
        await supabaseAdmin.from("billing_events").insert({
          organization_id: organizationId,
          stripe_event_id: event.id,
          event_type: event.type,
          payload: session as unknown as Record<string, unknown>,
          processed_at: new Date().toISOString(),
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_failed", { 
          invoiceId: invoice.id,
          customerId: invoice.customer 
        });

        // Find organization by customer ID
        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", invoice.customer as string)
          .maybeSingle();

        if (org) {
          await supabaseAdmin
            .from("organizations")
            .update({ subscription_status: "past_due" })
            .eq("id", org.id);

          logStep("Organization marked as past_due", { organizationId: org.id });

          await supabaseAdmin.from("billing_events").insert({
            organization_id: org.id,
            stripe_event_id: event.id,
            event_type: event.type,
            payload: invoice as unknown as Record<string, unknown>,
            processed_at: new Date().toISOString(),
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.deleted", { 
          subscriptionId: subscription.id,
          customerId: subscription.customer 
        });

        // Find organization by customer ID
        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", subscription.customer as string)
          .maybeSingle();

        if (org) {
          await supabaseAdmin
            .from("organizations")
            .update({ 
              subscription_status: "canceled",
              stripe_subscription_id: null,
            })
            .eq("id", org.id);

          logStep("Organization subscription canceled", { organizationId: org.id });

          await supabaseAdmin.from("billing_events").insert({
            organization_id: org.id,
            stripe_event_id: event.id,
            event_type: event.type,
            payload: subscription as unknown as Record<string, unknown>,
            processed_at: new Date().toISOString(),
          });
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.updated", { 
          subscriptionId: subscription.id,
          status: subscription.status 
        });

        // Find organization by customer ID
        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", subscription.customer as string)
          .maybeSingle();

        if (org) {
          // Get the product ID from the subscription items
          const productId = subscription.items.data[0]?.price?.product as string;
          const planKey = PLAN_KEY_MAP[productId] || "solo";

          // Map Stripe subscription status to our status
          let subscriptionStatus: string;
          switch (subscription.status) {
            case "active":
            case "trialing":
              subscriptionStatus = "active";
              break;
            case "past_due":
              subscriptionStatus = "past_due";
              break;
            case "canceled":
            case "unpaid":
              subscriptionStatus = "canceled";
              break;
            default:
              subscriptionStatus = "active";
          }

          await supabaseAdmin
            .from("organizations")
            .update({
              subscription_status: subscriptionStatus,
              plan_key: planKey,
              trial_ends_at: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null,
            })
            .eq("id", org.id);

          logStep("Organization subscription updated", { 
            organizationId: org.id, 
            planKey, 
            status: subscriptionStatus 
          });

          await supabaseAdmin.from("billing_events").insert({
            organization_id: org.id,
            stripe_event_id: event.id,
            event_type: event.type,
            payload: subscription as unknown as Record<string, unknown>,
            processed_at: new Date().toISOString(),
          });
        }

        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR: Webhook processing failed", { error: errorMessage });
    // Always return 200 to prevent Stripe retries for our internal errors
    return new Response(JSON.stringify({ received: true, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
