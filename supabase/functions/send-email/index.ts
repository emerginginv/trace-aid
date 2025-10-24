import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Default from email - use a verified sender from your Mailjet account
    const defaultFromEmail = fromEmail || "noreply@yourdomain.com";

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
          ...(isHtml ? { HTMLPart: body } : { TextPart: body }),
        },
      ],
    };

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
