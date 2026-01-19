import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userId: string;
  organizationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, organizationId }: WelcomeEmailRequest = await req.json();

    console.log('[WELCOME-EMAIL] Processing request for user:', userId, 'org:', organizationId);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('[WELCOME-EMAIL] Error fetching profile:', profileError);
      throw new Error('User profile not found');
    }

    // Get organization with subdomain
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, subdomain')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      console.error('[WELCOME-EMAIL] Error fetching organization:', orgError);
      throw new Error('Organization not found');
    }

    const portalUrl = organization.subdomain 
      ? `https://${organization.subdomain}.caseinformation.app`
      : 'https://caseinformation.app';

    const userName = profile.first_name || profile.email?.split('@')[0] || 'there';

    // Get Mailjet credentials
    const apiKey = Deno.env.get("MAILJET_API_KEY");
    const secretKey = Deno.env.get("MAILJET_SECRET_KEY");

    if (!apiKey || !secretKey) {
      throw new Error("Mailjet API credentials not configured");
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CaseWyze</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to CaseWyze! 🎉</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi ${userName},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Your account for <strong>${organization.name}</strong> has been created successfully!
              </p>
              
              <!-- Portal URL Box -->
              <div style="background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 24px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #1e40af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Your Case Management Portal
                </p>
                <a href="${portalUrl}" style="display: inline-block; font-size: 18px; color: #1d4ed8; font-weight: 700; text-decoration: none; word-break: break-all;">
                  ${portalUrl}
                </a>
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #6b7280;">
                  Bookmark this URL for quick access
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                  Go to Your Portal →
                </a>
              </div>
              
              <!-- Quick Start Guide -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-top: 30px;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;">
                  Quick Start Guide
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                  <li>Complete your organization profile in Settings</li>
                  <li>Invite team members to collaborate</li>
                  <li>Create your first case to get started</li>
                  <li>Explore document templates for faster workflows</li>
                </ul>
              </div>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Need help? Visit our <a href="https://caseinformation.app/help" style="color: #3b82f6; text-decoration: none;">Help Center</a> or contact us at <a href="mailto:support@caseinformation.app" style="color: #3b82f6; text-decoration: none;">support@caseinformation.app</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} CaseWyze. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const mailjetPayload = {
      Messages: [
        {
          From: {
            Email: "support@caseinformation.app",
            Name: "CaseWyze",
          },
          To: [
            {
              Email: profile.email,
              Name: profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : undefined,
            },
          ],
          Subject: `Welcome to CaseWyze! Your portal is ready`,
          HTMLPart: emailHtml,
        },
      ],
    };

    const credentials = btoa(`${apiKey}:${secretKey}`);

    const mailjetResponse = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(mailjetPayload),
    });

    const responseData = await mailjetResponse.json();

    if (!mailjetResponse.ok) {
      console.error("[WELCOME-EMAIL] Mailjet API error:", responseData);
      throw new Error(responseData.ErrorMessage || "Failed to send email");
    }

    console.log("[WELCOME-EMAIL] Email sent successfully to:", profile.email);

    return new Response(
      JSON.stringify({ success: true, portalUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[WELCOME-EMAIL] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
