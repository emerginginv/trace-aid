import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string;
  userName: string;
  notificationTitle: string;
  notificationMessage: string;
  link?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, userName, notificationTitle, notificationMessage, link }: NotificationEmailRequest = await req.json();

    console.log("Sending notification email to:", to);

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      throw new Error("Mailjet API credentials not configured");
    }

    const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);

    const emailBody = {
      Messages: [
        {
          From: {
            Email: "no-reply@yourapp.com",
            Name: "TraceAid Notifications",
          },
          To: [
            {
              Email: to,
              Name: userName,
            },
          ],
          Subject: notificationTitle,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">${notificationTitle}</h2>
              <p style="color: #666; font-size: 16px;">${notificationMessage}</p>
              ${link ? `<p style="margin-top: 20px;"><a href="${link}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Details</a></p>` : ''}
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">You received this email because you have notifications enabled in your TraceAid account settings.</p>
            </div>
          `,
        },
      ],
    };

    const mailjetResponse = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(emailBody),
    });

    if (!mailjetResponse.ok) {
      const errorText = await mailjetResponse.text();
      console.error("Mailjet API error:", errorText);
      throw new Error(`Mailjet API error: ${mailjetResponse.status} - ${errorText}`);
    }

    const result = await mailjetResponse.json();
    console.log("Notification email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
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
