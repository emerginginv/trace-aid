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
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      throw new Error("Missing token");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find the email change request
    const { data: request, error: fetchError } = await supabaseAdmin
      .from("email_change_requests")
      .select("*")
      .eq("token", token)
      .is("completed_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (fetchError || !request) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Invalid or Expired Link</h1>
          <p>This email change link is invalid or has expired.</p>
          <p>Please request a new email change from your settings.</p>
        </body>
        </html>
        `,
        {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
          status: 400,
        }
      );
    }

    // Update user's email using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      request.user_id,
      { email: request.new_email }
    );

    if (updateError) {
      console.error("Error updating user email:", updateError);
      throw updateError;
    }

    // Update profile email
    await supabaseAdmin
      .from("profiles")
      .update({ email: request.new_email })
      .eq("id", request.user_id);

    // Mark request as completed
    await supabaseAdmin
      .from("email_change_requests")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", request.id);

    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Changed Successfully</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .success { color: #16a34a; }
          .button { 
            display: inline-block; 
            background-color: #4F46E5; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1 class="success">✓ Email Changed Successfully</h1>
        <p>Your email address has been updated to <strong>${request.new_email}</strong></p>
        <p>You can now use this email address to log in.</p>
        <a href="/" class="button">Return to Application</a>
      </body>
      </html>
      `,
      {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in confirm-email-change:", error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .error { color: #dc2626; }
        </style>
      </head>
      <body>
        <h1 class="error">Error</h1>
        <p>Something went wrong while changing your email address.</p>
        <p>Please contact support if the problem persists.</p>
      </body>
      </html>
      `,
      {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
        status: 500,
      }
    );
  }
});