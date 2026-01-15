import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

/**
 * ExpenseEntry interface matching expense_entries table schema.
 * This is the canonical source for expense data.
 */
export interface ExpenseEntry {
  id: string;
  case_id: string;
  event_id: string | null;
  update_id: string | null;
  user_id: string;
  organization_id: string;
  quantity: number;
  rate: number;           // Internal cost/pay rate
  total: number;          // Total internal cost (quantity × rate)
  status: string;
  created_at: string;
  updated_at: string;
  finance_item_id: string | null;
  invoice_rate: number | null;  // Client billing rate
  item_type: string;
  notes: string | null;
  receipt_url: string | null;
  // Joined case data
  case_number?: string;
  case_title?: string;
  user_name?: string;
}

// Legacy interface for backward compatibility with existing code
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
  // Joined case data
  case_number?: string;
  case_title?: string;
}

export type ExpenseInput = Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'case_number' | 'case_title'>;

interface UseExpenseEntriesQueryOptions {
  caseId?: string;
  status?: string;
  userId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for fetching expense entries from the canonical expense_entries table.
 */
export function useExpenseEntriesQuery(options: UseExpenseEntriesQueryOptions = {}) {
  const { organization } = useOrganization();
  const { caseId, status, userId, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['expense_entries', organization?.id, caseId, status, userId, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('expense_entries')
        .select(`
          *,
          cases:case_id (
            case_number,
            title
          ),
          profiles:user_id (
            full_name
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      if (status) {
        query = query.eq('status', status as any);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Flatten joined data
      return (data || []).map((item: any) => ({
        ...item,
        case_number: item.cases?.case_number,
        case_title: item.cases?.title,
        user_name: item.profiles?.full_name,
      })) as ExpenseEntry[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

// Legacy hook interface for backward compatibility
interface UseExpensesQueryOptions {
  caseId?: string;
  financeType?: 'expense' | 'time' | 'retainer';
  status?: string;
  userId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Legacy React Query hook for fetching expenses/time entries from case_finances.
 * @deprecated Use useExpenseEntriesQuery for expenses or useTimeEntriesQuery for time entries.
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
        .select(`
          *,
          cases:case_id (
            case_number,
            title
          )
        `)
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
      
      // Flatten case data
      return (data || []).map((item: any) => ({
        ...item,
        case_number: item.cases?.case_number,
        case_title: item.cases?.title,
      })) as Expense[];
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

/**
 * Mutation hook for creating an expense/time entry.
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: ExpenseInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('case_finances')
        .insert({
          ...input,
          organization_id: organization.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(`${data.finance_type === 'time' ? 'Time entry' : 'Expense'} created successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to create entry: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for updating an expense/time entry.
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from('case_finances')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Entry updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update entry: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for deleting an expense/time entry.
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from('case_finances')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      return expenseId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Entry deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete entry: ${error.message}`);
    },
  });
}

export default useExpensesQuery;
