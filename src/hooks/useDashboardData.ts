import { useState } from 'react';
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
  // Specialized hooks with React Query
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: financialSummary, isLoading: financialsLoading } = useDashboardFinancials();
  
  const {
    tasks,
    events,
    users,
    dueTasks,
    upcomingEvents,
    isLoading: activitiesLoading,
    handleTaskToggle,
  } = useDashboardActivities({ tasksFilter, eventsFilter });

  const { data: recentData, isLoading: recentLoading } = useDashboardRecent(
    { updatesFilter, expensesFilter },
    users
  );

  // Local state for mutations (backward compatibility)
  const [localTasks, setTasks] = useState<DashboardTask[]>([]);
  const [localEvents, setEvents] = useState<DashboardEvent[]>([]);
  const [localUpdates, setUpdates] = useState<DashboardUpdate[]>([]);
  const [localExpenses, setExpenses] = useState<DashboardExpense[]>([]);

  // Combined loading state
  const isLoading = statsLoading || financialsLoading || activitiesLoading || recentLoading;

  return {
    // Data from specialized hooks
    tasks,
    events,
    updates: recentData?.updates || [],
    expenses: recentData?.expenses || [],
    users,
    stats: stats || {
      totalCases: 0,
      activeCases: 0,
      openCases: 0,
      closedCases: 0,
      totalContacts: 0,
      totalAccounts: 0,
    },
    financialSummary: financialSummary || {
      totalRetainerFunds: 0,
      outstandingExpenses: 0,
      unpaidInvoices: 0,
    },
    updateTypePicklists: recentData?.updateTypePicklists || [],

    // Derived data
    dueTasks,
    upcomingEvents,

    // State
    isLoading,

    // Actions
    handleTaskToggle,
    
    // Setters for backward compatibility
    setTasks,
    setEvents,
    setUpdates,
    setExpenses,
  };
}

export default useDashboardData;
