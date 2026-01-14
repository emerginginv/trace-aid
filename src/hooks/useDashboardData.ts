import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { isPast, isToday, parseISO } from 'date-fns';

export interface DashboardTask {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  taskStatus: string;
  caseId: string;
  activityData: Record<string, unknown>;
  assignedUserId: string | null;
  assignedUserName: string | null;
}

export interface DashboardEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  eventStatus: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  caseId: string;
  activityData: Record<string, unknown>;
}

export interface DashboardUpdate {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
  updateType: string;
  authorId: string;
  authorName: string | null;
  caseId: string;
  updateData: Record<string, unknown>;
}

export interface DashboardExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  userId: string;
  submittedByName: string | null;
  caseId: string;
  financeData: Record<string, unknown>;
}

export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  openCases: number;
  closedCases: number;
  totalContacts: number;
  totalAccounts: number;
}

export interface FinancialSummary {
  totalRetainerFunds: number;
  outstandingExpenses: number;
  unpaidInvoices: number;
}

export interface OrgUser {
  id: string;
  email: string;
  full_name: string | null;
}

interface UseDashboardDataOptions {
  tasksFilter: 'my' | 'all';
  eventsFilter: 'my' | 'all';
  updatesFilter: 'my' | 'all';
  expensesFilter: 'my' | 'all';
}

export function useDashboardData({
  tasksFilter,
  eventsFilter,
  updatesFilter,
  expensesFilter,
}: UseDashboardDataOptions) {
  const { organization } = useOrganization();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [updates, setUpdates] = useState<DashboardUpdate[]>([]);
  const [expenses, setExpenses] = useState<DashboardExpense[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    openCases: 0,
    closedCases: 0,
    totalContacts: 0,
    totalAccounts: 0,
  });
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalRetainerFunds: 0,
    outstandingExpenses: 0,
    unpaidInvoices: 0,
  });
  const [updateTypePicklists, setUpdateTypePicklists] = useState<
    { value: string; color: string | null }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const orgId = organization.id;

      // Fetch stats filtered by organization
      const [casesResult, contactsResult, accountsResult] = await Promise.all([
        supabase.from('cases').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      ]);

      // Fetch all cases to categorize by status_type
      const { data: allCases } = await supabase
        .from('cases')
        .select('status')
        .eq('organization_id', orgId);

      // Fetch status picklists filtered by organization
      const [statusPicklistsResult, updateTypePicklistsResult] = await Promise.all([
        supabase
          .from('picklists')
          .select('value, status_type')
          .eq('type', 'case_status')
          .eq('is_active', true)
          .or(`organization_id.eq.${orgId},organization_id.is.null`),
        supabase
          .from('picklists')
          .select('value, color')
          .eq('type', 'update_type')
          .eq('is_active', true)
          .or(`organization_id.eq.${orgId},organization_id.is.null`),
      ]);

      const statusPicklists = statusPicklistsResult.data;
      if (updateTypePicklistsResult.data) {
        setUpdateTypePicklists(updateTypePicklistsResult.data);
      }

      let openCasesCount = 0;
      let closedCasesCount = 0;
      if (allCases && statusPicklists) {
        allCases.forEach((caseItem) => {
          const statusPicklist = statusPicklists.find((s) => s.value === caseItem.status);
          if (statusPicklist?.status_type === 'open') {
            openCasesCount++;
          } else if (statusPicklist?.status_type === 'closed') {
            closedCasesCount++;
          }
        });
      }

      const activeCasesResult = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'open');

      setStats({
        totalCases: casesResult.count || 0,
        activeCases: activeCasesResult.count || 0,
        openCases: openCasesCount,
        closedCases: closedCasesCount,
        totalContacts: contactsResult.count || 0,
        totalAccounts: accountsResult.count || 0,
      });

      // Fetch users for assignments filtered by organization
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId);

      const { data: orgUsers } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', orgMembers?.map((m) => m.user_id) || []);

      if (orgUsers) {
        setUsers(
          orgUsers.map((u) => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name,
          }))
        );
      }

      // Fetch tasks from case_activities (pending tasks only)
      let tasksQuery = supabase
        .from('case_activities')
        .select('*')
        .eq('organization_id', orgId)
        .eq('activity_type', 'task')
        .eq('completed', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(50);

      if (tasksFilter === 'my') {
        tasksQuery = tasksQuery.or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`);
      }

      const { data: activitiesData } = await tasksQuery;
      if (activitiesData) {
        const tasksData: DashboardTask[] = activitiesData.map((activity) => {
          const assignedUser = orgUsers?.find((u) => u.id === activity.assigned_user_id);
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
        setTasks(tasksData);
      }

      // Fetch calendar events from case_activities (upcoming events in next 30 days)
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
        eventsQuery = eventsQuery.or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`);
      }

      const { data: eventsData } = await eventsQuery;
      if (eventsData) {
        const calendarEvents: DashboardEvent[] = eventsData.map((event) => {
          const assignedUser = orgUsers?.find((u) => u.id === event.assigned_user_id);
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
        setEvents(calendarEvents);
      }

      // Fetch recent updates from case_updates
      let updatesQuery = supabase
        .from('case_updates')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (updatesFilter === 'my') {
        updatesQuery = updatesQuery.eq('user_id', user.id);
      }

      const { data: updatesData } = await updatesQuery;
      if (updatesData) {
        const recentUpdates: DashboardUpdate[] = updatesData.map((update) => {
          const author = orgUsers?.find((u) => u.id === update.user_id);
          return {
            id: update.id,
            message: update.title || update.description || 'Update',
            timestamp: update.created_at,
            type: update.update_type === 'status_change' ? 'warning' : 'info',
            updateType: update.update_type || 'general',
            authorId: update.user_id,
            authorName: author?.full_name || author?.email || null,
            caseId: update.case_id,
            updateData: update,
          };
        });
        setUpdates(recentUpdates);
      }

      // Fetch recent expenses from case_finances
      let expensesQuery = supabase
        .from('case_finances')
        .select('*')
        .eq('organization_id', orgId)
        .eq('finance_type', 'expense')
        .order('date', { ascending: false })
        .limit(5);

      if (expensesFilter === 'my') {
        expensesQuery = expensesQuery.eq('user_id', user.id);
      }

      const { data: expensesData } = await expensesQuery;
      if (expensesData) {
        const recentExpenses: DashboardExpense[] = expensesData.map((expense) => {
          const submitter = orgUsers?.find((u) => u.id === expense.user_id);
          return {
            id: expense.id,
            description: expense.description,
            amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount || '0'),
            date: expense.date,
            category: expense.category || 'General',
            userId: expense.user_id,
            submittedByName: submitter?.full_name || submitter?.email || null,
            caseId: expense.case_id,
            financeData: expense,
          };
        });
        setExpenses(recentExpenses);
      }

      // Fetch financial summary data
      const [retainerResult, pendingExpensesResult, unpaidInvoicesResult] = await Promise.all([
        supabase.from('retainer_funds').select('amount').eq('organization_id', orgId),
        supabase
          .from('case_finances')
          .select('amount')
          .eq('organization_id', orgId)
          .eq('finance_type', 'expense')
          .eq('status', 'pending'),
        supabase
          .from('invoices')
          .select('balance_due')
          .eq('organization_id', orgId)
          .gt('balance_due', 0),
      ]);

      const totalRetainer =
        retainerResult.data?.reduce((sum, r) => sum + parseFloat(String(r.amount) || '0'), 0) || 0;
      const outstandingExpenses =
        pendingExpensesResult.data?.reduce((sum, e) => sum + parseFloat(String(e.amount) || '0'), 0) || 0;
      const unpaidInvoicesTotal =
        unpaidInvoicesResult.data?.reduce((sum, i) => sum + parseFloat(String(i.balance_due) || '0'), 0) || 0;

      setFinancialSummary({
        totalRetainerFunds: totalRetainer,
        outstandingExpenses: outstandingExpenses,
        unpaidInvoices: unpaidInvoicesTotal,
      });

      setIsLoading(false);
    };

    fetchDashboardData();
  }, [organization?.id, tasksFilter, eventsFilter, updatesFilter, expensesFilter]);

  // Toggle task completion
  const handleTaskToggle = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const previousTasks = [...tasks];

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    toast({
      title: newStatus === 'completed' ? 'Task completed!' : 'Task reopened',
      description: task.title,
    });

    const { error } = await supabase
      .from('case_activities')
      .update({ completed: newStatus === 'completed' })
      .eq('id', taskId);

    if (error) {
      // Rollback on error
      setTasks(previousTasks);
      toast({
        title: 'Error',
        description: 'Failed to update task. Change reverted.',
        variant: 'destructive',
      });
    }
  };

  // Sort and filter tasks - overdue first, then by due date
  const dueTasks = tasks
    .filter((task) => task.status === 'pending')
    .sort((a, b) => {
      const aOverdue = isPast(parseISO(a.dueDate)) && !isToday(parseISO(a.dueDate));
      const bOverdue = isPast(parseISO(b.dueDate)) && !isToday(parseISO(b.dueDate));
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  // Show all upcoming events sorted by date
  const upcomingEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    // Data
    tasks,
    events,
    updates,
    expenses,
    users,
    stats,
    financialSummary,
    updateTypePicklists,

    // Derived
    dueTasks,
    upcomingEvents,

    // State
    isLoading,

    // Actions
    handleTaskToggle,
    setTasks,
    setEvents,
    setUpdates,
    setExpenses,
  };
}

export default useDashboardData;
