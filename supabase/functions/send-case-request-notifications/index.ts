import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requestId: string;
  requestNumber: string;
  submitterEmail?: string;
  submitterName: string;
  companyName?: string;
  baseUrl: string;
}

async function sendEmail(
  to: string,
  userName: string,
  subject: string,
  message: string,
  link?: string
): Promise<void> {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    console.log("Mailjet not configured, skipping email to:", to);
    return;
  }

  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);

  const emailBody = {
    Messages: [
      {
        From: {
          Email: "no-reply@yourapp.com",
          Name: "TraceAid Notifications",
        },
        To: [{ Email: to, Name: userName }],
        Subject: subject,
        HTMLPart: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${subject}</h2>
            <p style="color: #666; font-size: 16px;">${message}</p>
            ${link ? `<p style="margin-top: 20px;"><a href="${link}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Details</a></p>` : ''}
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">You received this email because of your TraceAid account settings.</p>
          </div>
        `,
      },
    ],
  };

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(emailBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to send email to ${to}:`, errorText);
    throw new Error(`Mailjet error: ${response.status}`);
  }

  console.log("Email sent successfully to:", to);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      requestId, 
      requestNumber, 
      submitterEmail, 
      submitterName, 
      companyName,
      baseUrl 
    }: NotificationRequest = await req.json();

    console.log("Processing notifications for request:", requestId, requestNumber);

    // Use service role to fetch sensitive notification settings from the database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the case request to find the source form
    const { data: requestData, error: requestError } = await supabase
      .from('case_requests')
      .select('source_form_id, organization_id')
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      console.error("Failed to fetch case request:", requestError);
      throw new Error("Case request not found");
    }

    let formSettings = null;

    // Fetch form settings if there's a source form
    if (requestData.source_form_id) {
      const { data: formData, error: formError } = await supabase
        .from('case_request_forms')
        .select(`
          send_confirmation_email,
          confirmation_email_subject,
          confirmation_email_body,
          notify_staff_on_submission,
          staff_notification_emails
        `)
        .eq('id', requestData.source_form_id)
        .single();

      if (formError) {
        console.error("Failed to fetch form settings:", formError);
      } else {
        formSettings = formData;
      }
    }

    // Default settings if no form or form settings not found
    const settings = {
      sendConfirmationEmail: formSettings?.send_confirmation_email ?? true,
      confirmationEmailSubject: formSettings?.confirmation_email_subject || 'Case Request Received',
      confirmationEmailBody: formSettings?.confirmation_email_body || 
        `Thank you for submitting your case request. Your request number is ${requestNumber}. We will review your request and get back to you shortly.`,
      notifyStaffOnSubmission: formSettings?.notify_staff_on_submission ?? true,
      staffNotificationEmails: formSettings?.staff_notification_emails || [],
    };

    const results = {
      confirmationSent: false,
      staffNotificationsSent: 0,
      errors: [] as string[],
    };

    // 1. Send confirmation email to submitter
    if (settings.sendConfirmationEmail && submitterEmail) {
      try {
        const processedBody = settings.confirmationEmailBody
          .replace(/\{request_number\}/gi, requestNumber)
          .replace(/\{name\}/gi, submitterName)
          .replace(/\{company\}/gi, companyName || '');

        await sendEmail(
          submitterEmail,
          submitterName,
          settings.confirmationEmailSubject,
          processedBody
        );
        results.confirmationSent = true;
        console.log("Confirmation email sent to:", submitterEmail);
      } catch (error: any) {
        console.error("Failed to send confirmation email:", error);
        results.errors.push(`Confirmation email failed: ${error.message}`);
      }
    }

    // 2. Send staff notifications
    if (settings.notifyStaffOnSubmission && settings.staffNotificationEmails.length > 0) {
      const staffSubject = `New Case Request: ${requestNumber}`;
      const staffMessage = `A new case request has been submitted${
        companyName ? ` by ${companyName}` : ''
      }${submitterName ? ` (${submitterName})` : ''}. Request number: ${requestNumber}`;
      const reviewLink = `${baseUrl}/case-requests`;

      for (const staffEmail of settings.staffNotificationEmails) {
        if (!staffEmail || !staffEmail.trim()) continue;

        try {
          await sendEmail(
            staffEmail.trim(),
            'Team',
            staffSubject,
            staffMessage,
            reviewLink
          );
          results.staffNotificationsSent++;
          console.log("Staff notification sent to:", staffEmail);
        } catch (error: any) {
          console.error(`Failed to notify staff ${staffEmail}:`, error);
          results.errors.push(`Staff notification to ${staffEmail} failed`);
        }
      }
    }

    console.log("Notification processing complete:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-case-request-notifications:", error);
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
