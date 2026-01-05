import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "task" | "case" | "activity" | "user" | "expense" | "settings";
export type NotificationPriority = "low" | "medium" | "high";

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  link?: string;
  priority?: NotificationPriority;
}

/**
 * Creates a notification for the current user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Cannot create notification: User not authenticated');
      return { error: 'User not authenticated' };
    }

    // Get user's organization_id
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!orgMember?.organization_id) {
      console.error('Cannot create notification: User not in organization');
      return { error: 'User not in organization' };
    }

    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      organization_id: orgMember.organization_id,
      type: params.type,
      title: params.title,
      message: params.message,
      related_id: params.relatedId || null,
      related_type: params.relatedType || null,
      link: params.link || null,
      priority: params.priority || 'low',
      read: false,
    });

    if (error) {
      console.error('Error creating notification:', error);
      return { error };
    }

    // Check if user has email notifications enabled and send email
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_email, email, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.notification_email) {
      // Send email notification asynchronously (don't wait for it)
      supabase.functions.invoke('send-notification-email', {
        body: {
          to: profile.email,
          userName: profile.full_name || 'User',
          notificationTitle: params.title,
          notificationMessage: params.message,
          link: params.link ? `${window.location.origin}${params.link}` : undefined,
        },
      }).catch(err => console.error('Failed to send notification email:', err));
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected error creating notification:', error);
    return { error };
  }
}

/**
 * Creates a notification for a specific user (requires admin privileges or proper RLS setup)
 */
export async function createNotificationForUser(
  userId: string,
  params: Omit<CreateNotificationParams, 'userId'>
) {
  try {
    // Get user's organization_id
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .single();

    if (!orgMember?.organization_id) {
      console.error('Cannot create notification: User not in organization');
      return { error: 'User not in organization' };
    }

    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      organization_id: orgMember.organization_id,
      type: params.type,
      title: params.title,
      message: params.message,
      related_id: params.relatedId || null,
      related_type: params.relatedType || null,
      link: params.link || null,
      priority: params.priority || 'low',
      read: false,
    });

    if (error) {
      console.error('Error creating notification for user:', error);
      return { error };
    }

    // Check if user has email notifications enabled and send email
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_email, email, full_name')
      .eq('id', userId)
      .single();

    if (profile?.notification_email) {
      // Send email notification asynchronously (don't wait for it)
      supabase.functions.invoke('send-notification-email', {
        body: {
          to: profile.email,
          userName: profile.full_name || 'User',
          notificationTitle: params.title,
          notificationMessage: params.message,
          link: params.link ? `${window.location.origin}${params.link}` : undefined,
        },
      }).catch(err => console.error('Failed to send notification email:', err));
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected error creating notification for user:', error);
    return { error };
  }
}

/**
 * Sample notification creators for common events
 */
export const NotificationHelpers = {
  taskAssigned: (caseNumber: string, caseId: string) =>
    createNotification({
      type: 'task',
      title: 'Task Assigned',
      message: `New task assigned to you for Case #${caseNumber}`,
      relatedId: caseId,
      relatedType: 'case',
      link: `/cases/${caseId}`,
      priority: 'high',
    }),

  taskDueSoon: (taskTitle: string, caseId: string) =>
    createNotification({
      type: 'task',
      title: 'Task Due Soon',
      message: `${taskTitle} is due soon`,
      relatedId: caseId,
      relatedType: 'case',
      link: `/cases/${caseId}`,
      priority: 'high',
    }),

  caseStatusChanged: (caseNumber: string, newStatus: string, caseId: string) =>
    createNotification({
      type: 'case',
      title: 'Case Status Changed',
      message: `Case #${caseNumber} status updated to "${newStatus}"`,
      relatedId: caseId,
      relatedType: 'case',
      link: `/cases/${caseId}`,
      priority: 'medium',
    }),

  caseAssigned: (caseNumber: string, caseId: string) =>
    createNotification({
      type: 'case',
      title: 'Case Assigned',
      message: `New case #${caseNumber} has been assigned to you`,
      relatedId: caseId,
      relatedType: 'case',
      link: `/cases/${caseId}`,
      priority: 'high',
    }),

  newUpdate: (userName: string, caseNumber: string, caseId: string) =>
    createNotification({
      type: 'activity',
      title: 'New Update',
      message: `${userName} added an update to Case #${caseNumber}`,
      relatedId: caseId,
      relatedType: 'case',
      link: `/cases/${caseId}`,
      priority: 'low',
    }),

  fileUploaded: (fileCount: number, caseNumber: string, caseId: string) =>
    createNotification({
      type: 'activity',
      title: 'File Uploaded',
      message: `${fileCount} new file${fileCount > 1 ? 's' : ''} uploaded to Case #${caseNumber}`,
      relatedId: caseId,
      relatedType: 'case',
      link: `/cases/${caseId}`,
      priority: 'low',
    }),

  userAdded: (userName: string, role: string) =>
    createNotification({
      type: 'user',
      title: 'New User Added',
      message: `${userName} joined as ${role}`,
      link: '/settings',
      priority: 'low',
    }),

  roleChanged: (userName: string, newRole: string) =>
    createNotification({
      type: 'user',
      title: 'Role Changed',
      message: `${userName} role updated to ${newRole}`,
      link: '/settings',
      priority: 'medium',
    }),

  expenseApproved: (amount: number, expenseId: string) =>
    createNotification({
      type: 'expense',
      title: 'Expense Approved',
      message: `Expense of $${amount.toFixed(2)} has been approved`,
      relatedId: expenseId,
      relatedType: 'expense',
      link: '/expenses',
      priority: 'medium',
    }),

  expenseRejected: (amount: number, expenseId: string) =>
    createNotification({
      type: 'expense',
      title: 'Expense Rejected',
      message: `Expense of $${amount.toFixed(2)} has been rejected`,
      relatedId: expenseId,
      relatedType: 'expense',
      link: '/expenses',
      priority: 'medium',
    }),

  picklistUpdated: (picklistName: string, value: string) =>
    createNotification({
      type: 'settings',
      title: 'Picklist Updated',
      message: `New ${picklistName} value "${value}" added to system`,
      link: '/settings',
      priority: 'low',
    }),
};
