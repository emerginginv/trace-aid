import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { ActivityStatus } from '@/types/import';

/**
 * Activity type values - all activities use activity_type as a classification label
 */
export type ActivityType = 'task' | 'event' | 'meeting' | 'call' | 'deadline' | 'surveillance' | 'site_visit';

export interface Activity {
  id: string;
  title: string;
  description?: string;
  activity_type: ActivityType;
  status: ActivityStatus;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  end_date?: string;
  completed?: boolean;
  completed_at?: string;
  case_id: string;
  assigned_user_id?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  is_scheduled?: boolean;
  address?: string | null;
  case_service_instance_id?: string | null;
  organization_id?: string;
}

export type ActivityInput = Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

/**
 * Unified options for querying activities
 */
interface UseActivitiesQueryOptions {
  caseId?: string;
  /** Filter by specific activity types */
  activityTypes?: ActivityType[];
  /** Legacy: Single activity type filter (deprecated, use activityTypes instead) */
  activityType?: 'task' | 'event';
  status?: string | string[];
  completed?: boolean;
  assignedUserId?: string;
  /** Filter by whether activity has scheduled times */
  hasScheduledTime?: boolean;
  /** Only return activities with a due_date */
  hasDueDate?: boolean;
  limit?: number;
  enabled?: boolean;
}

/**
 * Helper functions for activity classification
 */
export const isScheduledActivity = (activity: Activity): boolean => {
  return activity.is_scheduled === true || 
    (activity.start_time != null && activity.end_time != null);
};

export const getActivityDisplayType = (activity: Activity): 'Scheduled' | 'Task' => {
  return isScheduledActivity(activity) ? 'Scheduled' : 'Task';
};

/**
 * React Query hook for fetching activities with flexible filtering.
 * This is the canonical hook for all activity queries.
 */
export function useActivitiesQuery(options: UseActivitiesQueryOptions = {}) {
  const { organization } = useOrganization();
  const { 
    caseId, 
    activityTypes, 
    activityType, // Legacy support
    status, 
    completed, 
    assignedUserId, 
    hasScheduledTime,
    hasDueDate,
    limit = 100, 
    enabled = true 
  } = options;

  return useQuery({
    queryKey: ['activities', organization?.id, caseId, activityTypes, activityType, status, completed, assignedUserId, hasScheduledTime, hasDueDate, limit],
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

      // Support both new activityTypes array and legacy activityType string
      if (activityTypes && activityTypes.length > 0) {
        query = query.in('activity_type', activityTypes);
      } else if (activityType) {
        query = query.eq('activity_type', activityType);
      }

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      if (completed !== undefined) {
        query = query.eq('completed', completed);
      }

      if (assignedUserId) {
        query = query.eq('assigned_user_id', assignedUserId);
      }

      // Filter by scheduled vs unscheduled
      if (hasScheduledTime === true) {
        query = query.not('start_time', 'is', null);
      } else if (hasScheduledTime === false) {
        query = query.is('start_time', null);
      }

      // Filter by has due date
      if (hasDueDate === true) {
        query = query.not('due_date', 'is', null);
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
 * @deprecated Use useActivitiesQuery with activityTypes filter instead
 * Kept for backwards compatibility - will be removed in next major release
 */
export function useTasksQuery(options: Omit<UseActivitiesQueryOptions, 'activityType' | 'activityTypes'> = {}) {
  console.warn('useTasksQuery is deprecated. Use useActivitiesQuery({ activityTypes: ["task"] }) instead.');
  return useActivitiesQuery({ ...options, activityType: 'task' });
}

/**
 * @deprecated Use useActivitiesQuery with activityTypes filter instead
 * Kept for backwards compatibility - will be removed in next major release
 */
export function useEventsQuery(options: Omit<UseActivitiesQueryOptions, 'activityType' | 'activityTypes'> = {}) {
  console.warn('useEventsQuery is deprecated. Use useActivitiesQuery({ activityTypes: ["event"] }) instead.');
  return useActivitiesQuery({ ...options, activityType: 'event' });
}

/**
 * Hook for pending activities (uncompleted tasks and events)
 */
export function usePendingActivitiesQuery(options: Omit<UseActivitiesQueryOptions, 'completed'> = {}) {
  return useActivitiesQuery({ ...options, completed: false });
}

/**
 * @deprecated Use usePendingActivitiesQuery instead
 */
export function usePendingTasksQuery(options: Omit<UseActivitiesQueryOptions, 'activityType' | 'completed'> = {}) {
  console.warn('usePendingTasksQuery is deprecated. Use usePendingActivitiesQuery instead.');
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
