import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { newEmail } = await req.json();

    // Validate new email
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new Error("Invalid email address");
    }

    if (newEmail.toLowerCase() === user.email?.toLowerCase()) {
      throw new Error("New email must be different from current email");
    }

    // Generate unique token
    const token = crypto.randomUUID();

    // Store email change request
    const { error: insertError } = await supabaseClient
      .from("email_change_requests")
      .insert({
        user_id: user.id,
        old_email: user.email!,
        new_email: newEmail,
        token: token,
      });

    if (insertError) throw insertError;

    // Send confirmation email to OLD email address using Lovable's built-in system
    const confirmationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/confirm-email-change?token=${token}`;

    // Trigger email via Lovable's email webhook (same as password reset)
    const emailHookUrl = `https://lovable-api.com/projects/${Deno.env.get("VITE_SUPABASE_PROJECT_ID")}/backend/email-hook`;
    
    const emailPayload = {
      type: "email_change",
      user: {
        email: user.email,
        id: user.id
      },
      data: {
        confirmation_url: confirmationUrl,
        new_email: newEmail,
        old_email: user.email
      }
    };

    const emailResponse = await fetch(emailHookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailResponse.ok) {
      console.error("Email hook error:", await emailResponse.text());
      throw new Error("Failed to send confirmation email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation email sent to your current email address",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in request-email-change:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});