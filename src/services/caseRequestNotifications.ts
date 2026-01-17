import { supabase } from '@/integrations/supabase/client';

export interface SubmitterInfo {
  email: string;
  name: string;
  companyName?: string;
}

export interface NotificationParams {
  requestId: string;
  requestNumber: string;
  submitterInfo: SubmitterInfo;
}

/**
 * Send notifications after a case request is submitted.
 * This function calls the server-side edge function which handles:
 * - Fetching notification settings securely from the database
 * - Sending confirmation email to the submitter
 * - Sending staff notification emails
 * 
 * Staff notification emails are NOT exposed to the client - they are
 * fetched server-side using the service role for security.
 */
export async function sendCaseRequestNotifications(
  params: NotificationParams
): Promise<void> {
  const { requestId, requestNumber, submitterInfo } = params;

  try {
    const baseUrl = window.location.origin;

    const { data, error } = await supabase.functions.invoke('send-case-request-notifications', {
      body: {
        requestId,
        requestNumber,
        submitterEmail: submitterInfo.email || undefined,
        submitterName: submitterInfo.name,
        companyName: submitterInfo.companyName,
        baseUrl,
      },
    });

    if (error) {
      console.error('Notification edge function error:', error);
      return;
    }

    console.log('Case request notifications processed:', data);
  } catch (error) {
    console.error('Failed to send case request notifications:', error);
    // Don't throw - notification failure shouldn't fail the submission
  }
}
