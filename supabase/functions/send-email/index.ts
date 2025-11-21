import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  fromName?: string;
  fromEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, isHtml = false, fromName = "Legal Case Manager", fromEmail }: EmailRequest = await req.json();

    console.log("Sending email to:", to);

    const apiKey = Deno.env.get("MAILJET_API_KEY");
    const secretKey = Deno.env.get("MAILJET_SECRET_KEY");

    if (!apiKey || !secretKey) {
      throw new Error("Mailjet API credentials not configured");
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    let emailSignature = '';
    
    if (authHeader) {
      try {
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user from token
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          // Get organization settings for signature
          const { data: orgSettings } = await supabase
            .from('organization_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (orgSettings) {
            // Build HTML signature
            emailSignature = `
              <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-family: Arial, sans-serif; font-size: 14px; color: #333;">
                ${orgSettings.logo_url ? `<div style="margin-bottom: 12px;"><img src="${orgSettings.logo_url}" alt="Company logo" style="height: 40px; width: auto;" /></div>` : ''}
                ${orgSettings.signature_name ? `<div style="font-weight: bold; margin-bottom: 4px;">${orgSettings.signature_name}</div>` : ''}
                ${orgSettings.signature_title ? `<div style="color: #666; margin-bottom: 8px;">${orgSettings.signature_title}</div>` : ''}
                ${orgSettings.company_name ? `<div style="font-weight: 500; margin-bottom: 8px;">${orgSettings.company_name}</div>` : ''}
                ${(orgSettings.signature_phone || orgSettings.signature_email) ? `
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                    ${orgSettings.signature_phone ? `<div style="margin-bottom: 4px;">📞 ${orgSettings.signature_phone}</div>` : ''}
                    ${orgSettings.signature_email ? `<div>✉️ <a href="mailto:${orgSettings.signature_email}" style="color: #2563eb; text-decoration: none;">${orgSettings.signature_email}</a></div>` : ''}
                  </div>
                ` : ''}
                ${orgSettings.address ? `<div style="margin-top: 8px; color: #666; font-size: 12px;">${orgSettings.address.replace(/\n/g, '<br>')}</div>` : ''}
              </div>
            `;
          }
        }
      } catch (error) {
        console.error('Error fetching signature:', error);
        // Continue without signature on error
      }
    }

    // Default from email - use verified sender from organization settings or fallback
    let defaultFromEmail = fromEmail || "noreply@yourdomain.com";
    
    // Get sender email from organization settings if available
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          const { data: orgSettings } = await supabase
            .from('organization_settings')
            .select('sender_email')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (orgSettings?.sender_email) {
            defaultFromEmail = orgSettings.sender_email;
          }
        }
      } catch (error) {
        console.error('Error fetching sender email:', error);
      }
    }

    // Append signature to body if HTML mode
    const finalBody = isHtml ? body + emailSignature : body;

    console.log("Email parameters:", { to, subject, isHtml, bodyLength: body?.length, finalBodyLength: finalBody?.length });

    const mailjetPayload = {
      Messages: [
        {
          From: {
            Email: defaultFromEmail,
            Name: fromName,
          },
          To: [
            {
              Email: to,
            },
          ],
          Subject: subject,
          [isHtml ? "HTMLPart" : "TextPart"]: finalBody,
        },
      ],
    };

    console.log("Mailjet payload structure:", {
      hasHTMLPart: !!mailjetPayload.Messages[0]["HTMLPart"],
      hasTextPart: !!mailjetPayload.Messages[0]["TextPart"],
      isHtml
    });

    // Mailjet uses Basic Auth with API Key as username and Secret Key as password
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
      console.error("Mailjet API error:", responseData);
      throw new Error(responseData.ErrorMessage || "Failed to send email");
    }

    console.log("Email sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
