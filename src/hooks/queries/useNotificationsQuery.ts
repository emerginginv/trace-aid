import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  user_id: string;
  created_at: string;
}

export type NotificationInput = Omit<Notification, 'id' | 'user_id' | 'read' | 'created_at'>;

interface UseNotificationsQueryOptions {
  unreadOnly?: boolean;
  type?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for fetching user notifications with caching.
 */
export function useNotificationsQuery(options: UseNotificationsQueryOptions = {}) {
  const { organization } = useOrganization();
  const { unreadOnly = false, type, limit = 50, enabled = true } = options;

  return useQuery({
    queryKey: ['notifications', organization?.id, unreadOnly, type, limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) return [];

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      if (type) {
        query = query.eq('type', type);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 30, // 30 seconds - notifications need to be fresh
  });
}

/**
 * Hook for unread notifications count.
 */
export function useUnreadNotificationsCount() {
  const { data: notifications = [], isLoading } = useNotificationsQuery({ unreadOnly: true });
  return { count: notifications.length, isLoading };
}

/**
 * Mutation hook for marking a notification as read.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Mutation hook for marking all notifications as read.
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      toast.error(`Failed to mark notifications: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for creating a notification.
 */
export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: NotificationInput & { user_id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...input,
          organization_id: organization.id,
          user_id: input.user_id || user.id,
          read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Mutation hook for deleting a notification.
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export default useNotificationsQuery;
