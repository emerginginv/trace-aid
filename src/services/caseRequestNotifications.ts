import { supabase } from '@/integrations/supabase/client';

export interface NotificationFormSettings {
  sendConfirmationEmail: boolean;
  confirmationEmailSubject?: string;
  confirmationEmailBody?: string;
  notifyStaffOnSubmission: boolean;
  staffNotificationEmails?: string[];
}

export interface SubmitterInfo {
  email: string;
  name: string;
  companyName?: string;
}

export interface NotificationParams {
  requestId: string;
  requestNumber: string;
  formSettings: NotificationFormSettings;
  submitterInfo: SubmitterInfo;
}

/**
 * Send notifications after a case request is submitted.
 * This function is non-blocking - errors are logged but don't throw.
 */
export async function sendCaseRequestNotifications(
  params: NotificationParams
): Promise<void> {
  const { requestNumber, formSettings, submitterInfo } = params;

  // 1. Send confirmation email to submitter (if enabled)
  if (formSettings.sendConfirmationEmail && submitterInfo.email) {
    try {
      const subject = formSettings.confirmationEmailSubject || 'Case Request Received';
      const body = formSettings.confirmationEmailBody || 
        `Thank you for submitting your case request. Your request number is ${requestNumber}. We will review your request and get back to you shortly.`;

      // Replace placeholders in the body
      const processedBody = body
        .replace(/\{request_number\}/gi, requestNumber)
        .replace(/\{name\}/gi, submitterInfo.name)
        .replace(/\{company\}/gi, submitterInfo.companyName || '');

      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: submitterInfo.email,
          userName: submitterInfo.name,
          notificationTitle: subject,
          notificationMessage: processedBody,
          link: null, // No link for public submitters
        },
      });

      console.log('Confirmation email sent to:', submitterInfo.email);
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      // Don't throw - email failure shouldn't fail the submission
    }
  }

  // 2. Send staff notifications (if enabled)
  if (
    formSettings.notifyStaffOnSubmission &&
    formSettings.staffNotificationEmails &&
    formSettings.staffNotificationEmails.length > 0
  ) {
    const staffSubject = `New Case Request: ${requestNumber}`;
    const staffMessage = `A new case request has been submitted${
      submitterInfo.companyName ? ` by ${submitterInfo.companyName}` : ''
    }${submitterInfo.name ? ` (${submitterInfo.name})` : ''}. Request number: ${requestNumber}`;

    // Get the base URL for internal links
    const baseUrl = window.location.origin;
    const reviewLink = `${baseUrl}/case-requests`;

    for (const staffEmail of formSettings.staffNotificationEmails) {
      if (!staffEmail || !staffEmail.trim()) continue;

      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: staffEmail.trim(),
            userName: 'Team',
            notificationTitle: staffSubject,
            notificationMessage: staffMessage,
            link: reviewLink,
          },
        });

        console.log('Staff notification sent to:', staffEmail);
      } catch (error) {
        console.error(`Failed to send staff notification to ${staffEmail}:`, error);
        // Continue with other staff emails even if one fails
      }
    }
  }
}
