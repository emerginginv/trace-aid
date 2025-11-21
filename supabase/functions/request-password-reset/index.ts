import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Generate a unique token for the password reset request
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Insert the password reset request
    const { error: insertError } = await supabaseClient
      .from('password_reset_requests')
      .insert({
        user_id: user.id,
        token,
        email: user.email,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error creating password reset request:', insertError);
      throw new Error('Failed to create password reset request');
    }

    // Send confirmation email
    const confirmUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/confirm-password-reset?token=${token}`;
    
    const { error: emailError } = await supabaseClient.functions.invoke(
      "send-email",
      {
        body: {
          to: user.email,
          subject: "Confirm Password Reset Request",
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
              <p style="color: #666; margin-bottom: 20px;">
                You have requested to reset your password. Click the button below to confirm and proceed with resetting your password.
              </p>
              <p style="margin-bottom: 30px;">
                <a href="${confirmUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Confirm Password Reset
                </a>
              </p>
              <p style="color: #999; font-size: 14px; margin-top: 30px;">
                If you didn't request this password reset, please ignore this email. This link will expire in 1 hour.
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                Or copy and paste this link into your browser:<br>
                <span style="color: #007bff;">${confirmUrl}</span>
              </p>
            </div>
          `,
          isHtml: true,
        },
      }
    );

    if (emailError) {
      console.error('Error sending confirmation email:', emailError);
      throw new Error('Failed to send confirmation email');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Confirmation email sent to your email address' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in request-password-reset:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
