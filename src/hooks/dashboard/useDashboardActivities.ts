import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { isPast, isToday, parseISO } from 'date-fns';
import type { DashboardTask, DashboardEvent, OrgUser } from './types';

interface UseDashboardActivitiesOptions {
  tasksFilter: 'my' | 'all';
  eventsFilter: 'my' | 'all';
}

interface ActivitiesData {
  tasks: DashboardTask[];
  events: DashboardEvent[];
  users: OrgUser[];
}

async function fetchActivities(
  orgId: string,
  userId: string,
  tasksFilter: 'my' | 'all',
  eventsFilter: 'my' | 'all'
): Promise<ActivitiesData> {
  // Fetch org users first for assignment lookups
  const { data: orgMembers } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', orgId);

  const { data: orgUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', orgMembers?.map((m) => m.user_id) || []);

  const users: OrgUser[] = orgUsers?.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
  })) || [];

  // Fetch tasks
  let tasksQuery = supabase
    .from('case_activities')
    .select('*')
    .eq('organization_id', orgId)
    .eq('activity_type', 'task')
    .eq('completed', false)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(50);

  if (tasksFilter === 'my') {
    tasksQuery = tasksQuery.or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`);
  }

  const { data: activitiesData } = await tasksQuery;
  
  const tasks: DashboardTask[] = (activitiesData || []).map((activity) => {
    const assignedUser = users.find((u) => u.id === activity.assigned_user_id);
    return {
      id: activity.id,
      title: activity.title,
      dueDate: activity.due_date || new Date().toISOString().split('T')[0],
      priority:
        activity.status === 'urgent'
          ? 'high'
          : activity.status === 'in_progress'
          ? 'medium'
          : 'low',
      status: activity.completed ? 'completed' : 'pending',
      taskStatus: activity.status || 'to_do',
      caseId: activity.case_id,
      activityData: activity,
      assignedUserId: activity.assigned_user_id,
      assignedUserName: assignedUser?.full_name || assignedUser?.email || null,
    };
  });

  // Fetch events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  let eventsQuery = supabase
    .from('case_activities')
    .select('*')
    .eq('organization_id', orgId)
    .eq('activity_type', 'event')
    .not('due_date', 'is', null)
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', futureDate.toISOString().split('T')[0])
    .order('due_date', { ascending: true })
    .limit(50);

  if (eventsFilter === 'my') {
    eventsQuery = eventsQuery.or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`);
  }

  const { data: eventsData } = await eventsQuery;
  
  const events: DashboardEvent[] = (eventsData || []).map((event) => {
    const assignedUser = users.find((u) => u.id === event.assigned_user_id);
    return {
      id: event.id,
      title: event.title,
      date: event.due_date,
      time: 'All Day',
      type: event.activity_type || 'event',
      eventStatus: event.status || 'to_do',
      assignedUserId: event.assigned_user_id,
      assignedUserName: assignedUser?.full_name || assignedUser?.email || null,
      caseId: event.case_id,
      activityData: event,
    };
  });

  return { tasks, events, users };
}

export function useDashboardActivities({ tasksFilter, eventsFilter }: UseDashboardActivitiesOptions) {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const query = useQuery({
    queryKey: ['dashboard', 'activities', orgId, tasksFilter, eventsFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !orgId) throw new Error('Not authenticated');
      return fetchActivities(orgId, user.id, tasksFilter, eventsFilter);
    },
    enabled: !!orgId,
    staleTime: 30 * 1000,
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('case_activities')
        .update({ completed })
        .eq('id', taskId);
      if (error) throw error;
      return { taskId, completed };
    },
    onMutate: async ({ taskId, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['dashboard', 'activities'] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<ActivitiesData>(['dashboard', 'activities', orgId, tasksFilter, eventsFilter]);
      
      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<ActivitiesData>(
          ['dashboard', 'activities', orgId, tasksFilter, eventsFilter],
          {
            ...previousData,
            tasks: previousData.tasks.map((t) =>
              t.id === taskId ? { ...t, status: completed ? 'completed' : 'pending' } : t
            ),
          }
        );
      }
      
      return { previousData };
    },
    onSuccess: (_, { completed }) => {
      toast({
        title: completed ? 'Task completed!' : 'Task reopened',
      });
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ['dashboard', 'activities', orgId, tasksFilter, eventsFilter],
          context.previousData
        );
      }
      toast({
        title: 'Error',
        description: 'Failed to update task. Change reverted.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'activities'] });
    },
  });

  const tasks = query.data?.tasks || [];
  const events = query.data?.events || [];
  const users = query.data?.users || [];

  // Derived data: sort tasks with overdue first
  const dueTasks = tasks
    .filter((task) => task.status === 'pending')
    .sort((a, b) => {
      const aOverdue = isPast(parseISO(a.dueDate)) && !isToday(parseISO(a.dueDate));
      const bOverdue = isPast(parseISO(b.dueDate)) && !isToday(parseISO(b.dueDate));
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  // Derived data: sort events by date
  const upcomingEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const handleTaskToggle = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    toggleTaskMutation.mutate({ taskId, completed: task.status !== 'completed' });
  };

  return {
    tasks,
    events,
    users,
    dueTasks,
    upcomingEvents,
    isLoading: query.isLoading,
    handleTaskToggle,
  };
}
