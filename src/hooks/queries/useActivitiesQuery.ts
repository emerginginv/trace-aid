import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { ActivityStatus } from '@/types/import';

export interface Activity {
  id: string;
  title: string;
  description?: string;
  activity_type: 'task' | 'event';
  status: ActivityStatus;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  completed?: boolean;
  completed_at?: string;
  case_id: string;
  assigned_user_id?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  is_scheduled?: boolean; // Computed column
}

export type ActivityInput = Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

interface UseActivitiesQueryOptions {
  caseId?: string;
  activityType?: 'task' | 'event';
  status?: string;
  completed?: boolean;
  assignedUserId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for fetching activities (tasks/events) with caching.
 */
export function useActivitiesQuery(options: UseActivitiesQueryOptions = {}) {
  const { organization } = useOrganization();
  const { caseId, activityType, status, completed, assignedUserId, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['activities', organization?.id, caseId, activityType, status, completed, assignedUserId, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('case_activities')
        .select('*')
        .eq('organization_id', organization.id)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      if (activityType) {
        query = query.eq('activity_type', activityType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (completed !== undefined) {
        query = query.eq('completed', completed);
      }

      if (assignedUserId) {
        query = query.eq('assigned_user_id', assignedUserId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Activity[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 1, // 1 minute for activities (more dynamic)
  });
}

/**
 * Convenience hook for fetching tasks only.
 */
export function useTasksQuery(options: Omit<UseActivitiesQueryOptions, 'activityType'> = {}) {
  return useActivitiesQuery({ ...options, activityType: 'task' });
}

/**
 * Convenience hook for fetching events only.
 */
export function useEventsQuery(options: Omit<UseActivitiesQueryOptions, 'activityType'> = {}) {
  return useActivitiesQuery({ ...options, activityType: 'event' });
}

/**
 * Hook for pending tasks (uncompleted).
 */
export function usePendingTasksQuery(options: Omit<UseActivitiesQueryOptions, 'activityType' | 'completed'> = {}) {
  return useActivitiesQuery({ ...options, activityType: 'task', completed: false });
}

/**
 * Mutation hook for creating an activity.
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: ActivityInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('case_activities')
        .insert({
          ...input,
          organization_id: organization.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Activity created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create activity: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for updating an activity.
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Activity> & { id: string }) => {
      const { data, error } = await supabase
        .from('case_activities')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Activity updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update activity: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for completing/uncompleting an activity.
 */
export function useToggleActivityComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from('case_activities')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Activity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success(data.completed ? 'Activity completed' : 'Activity reopened');
    },
    onError: (error) => {
      toast.error(`Failed to update activity: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for deleting an activity.
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('case_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      return activityId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Activity deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete activity: ${error.message}`);
    },
  });
}

export default useActivitiesQuery;
