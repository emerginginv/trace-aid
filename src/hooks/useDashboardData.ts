import { useDashboardStats } from './dashboard/useDashboardStats';
import { useDashboardActivities } from './dashboard/useDashboardActivities';
import { useDashboardFinancials } from './dashboard/useDashboardFinancials';
import { useDashboardRecent } from './dashboard/useDashboardRecent';
import type {
  DashboardTask,
  DashboardEvent,
  DashboardUpdate,
  DashboardExpense,
  DashboardStats,
  FinancialSummary,
  OrgUser,
  UseDashboardDataOptions,
} from './dashboard/types';

// Re-export types for backward compatibility
export type {
  DashboardTask,
  DashboardEvent,
  DashboardUpdate,
  DashboardExpense,
  DashboardStats,
  FinancialSummary,
  OrgUser,
};

const defaultStats: DashboardStats = {
  totalCases: 0,
  activeCases: 0,
  openCases: 0,
  closedCases: 0,
  totalContacts: 0,
  totalAccounts: 0,
};

const defaultFinancials: FinancialSummary = {
  totalRetainerFunds: 0,
  outstandingExpenses: 0,
  unpaidInvoices: 0,
};

/**
 * Composite dashboard data hook that combines specialized hooks.
 * Provides backward compatibility with the original API while using
 * React Query under the hood for better caching and performance.
 */
export function useDashboardData({
  tasksFilter,
  eventsFilter,
  updatesFilter,
  expensesFilter,
}: UseDashboardDataOptions) {
  // Specialized hooks with React Query - all independent
  const statsQuery = useDashboardStats();
  const financialsQuery = useDashboardFinancials();
  const activitiesHook = useDashboardActivities({ tasksFilter, eventsFilter });
  const recentQuery = useDashboardRecent({ updatesFilter, expensesFilter });

  // Combined loading state
  const isLoading = statsQuery.isLoading || financialsQuery.isLoading || activitiesHook.isLoading || recentQuery.isLoading;

  return {
    // Data from specialized hooks
    tasks: activitiesHook.tasks,
    events: activitiesHook.events,
    updates: recentQuery.data?.updates || [],
    expenses: recentQuery.data?.expenses || [],
    users: activitiesHook.users,
    stats: statsQuery.data || defaultStats,
    financialSummary: financialsQuery.data || defaultFinancials,
    updateTypePicklists: recentQuery.data?.updateTypePicklists || [],

    // Derived data
    dueTasks: activitiesHook.dueTasks,
    upcomingEvents: activitiesHook.upcomingEvents,

    // State
    isLoading,

    // Actions
    handleTaskToggle: activitiesHook.handleTaskToggle,
    
    // Setters removed - use React Query mutations instead
    setTasks: () => {},
    setEvents: () => {},
    setUpdates: () => {},
    setExpenses: () => {},
  };
}

export default useDashboardData;
