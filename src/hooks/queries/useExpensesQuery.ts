import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  status: string;
  finance_type: string;
  case_id: string;
  user_id: string;
  notes?: string;
  hours?: number;
  hourly_rate?: number;
  quantity?: number;
  unit_price?: number;
  created_at: string;
  updated_at?: string;
}

interface UseExpensesQueryOptions {
  caseId?: string;
  financeType?: 'expense' | 'time' | 'retainer';
  status?: string;
  userId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for fetching expenses/time entries with caching.
 */
export function useExpensesQuery(options: UseExpensesQueryOptions = {}) {
  const { organization } = useOrganization();
  const { caseId, financeType, status, userId, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['expenses', organization?.id, caseId, financeType, status, userId, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('case_finances')
        .select('*')
        .eq('organization_id', organization.id)
        .order('date', { ascending: false });

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      if (financeType) {
        query = query.eq('finance_type', financeType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Convenience hook for fetching only expenses.
 */
export function useOnlyExpensesQuery(options: Omit<UseExpensesQueryOptions, 'financeType'> = {}) {
  return useExpensesQuery({ ...options, financeType: 'expense' });
}

/**
 * Convenience hook for fetching only time entries.
 */
export function useTimeEntriesQuery(options: Omit<UseExpensesQueryOptions, 'financeType'> = {}) {
  return useExpensesQuery({ ...options, financeType: 'time' });
}

/**
 * Hook to get expense statistics.
 */
export function useExpenseStats(caseId?: string) {
  const { data: expenses = [], isLoading } = useExpensesQuery({ caseId, financeType: 'expense' });
  const { data: timeEntries = [] } = useExpensesQuery({ caseId, financeType: 'time' });

  const stats = {
    totalExpenses: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    expenseCount: expenses.length,
    pendingExpenses: expenses.filter(e => e.status === 'pending').length,
    approvedExpenses: expenses.filter(e => e.status === 'approved').length,
    totalTime: timeEntries.reduce((sum, t) => sum + (t.hours || 0), 0),
    timeValue: timeEntries.reduce((sum, t) => sum + Number(t.amount), 0),
    timeEntryCount: timeEntries.length,
  };

  return { stats, isLoading };
}

export default useExpensesQuery;
