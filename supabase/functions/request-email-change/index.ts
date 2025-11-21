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

    // Send confirmation email to OLD email address
    const confirmationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/confirm-email-change?token=${token}`;

    const { error: emailError } = await supabaseClient.functions.invoke(
      "send-email",
      {
        body: {
          to: user.email,
          subject: "Confirm Email Address Change",
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Email Address Change Request</h2>
              <p>You requested to change your email address from <strong>${user.email}</strong> to <strong>${newEmail}</strong>.</p>
              <p>If you made this request, please click the button below to confirm:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}" 
                   style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Confirm Email Change
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this change, please ignore this email or contact support if you're concerned about your account security.</p>
            </div>
          `,
          isHtml: true,
        },
      }
    );

    if (emailError) {
      console.error("Error sending email:", emailError);
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