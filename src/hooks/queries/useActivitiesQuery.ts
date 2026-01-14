import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface Activity {
  id: string;
  title: string;
  description?: string;
  activity_type: 'task' | 'event';
  status: string;
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
}

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

export default useActivitiesQuery;
