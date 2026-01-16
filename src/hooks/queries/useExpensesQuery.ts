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
 * Legacy React Query hook for fetching expenses/time entries.
 * NOW queries from canonical tables (time_entries/expense_entries) instead of case_finances.
 */
export function useExpensesQuery(options: UseExpensesQueryOptions = {}) {
  const { organization } = useOrganization();
  const { caseId, financeType, status, userId, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['expenses', organization?.id, caseId, financeType, status, userId, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      const results: Expense[] = [];

      // Fetch from appropriate canonical table based on financeType
      if (!financeType || financeType === 'time') {
        let timeQuery = supabase
          .from('time_entries')
          .select(`
            *,
            cases:case_id (
              case_number,
              title
            )
          `)
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });

        if (caseId) timeQuery = timeQuery.eq('case_id', caseId);
        if (status) timeQuery = timeQuery.eq('status', status as any);
        if (userId) timeQuery = timeQuery.eq('user_id', userId);
        if (limit && !financeType) timeQuery = timeQuery.limit(Math.ceil(limit / 2));
        else if (limit) timeQuery = timeQuery.limit(limit);

        const { data: timeData, error: timeError } = await timeQuery;
        if (timeError) throw timeError;

        results.push(...(timeData || []).map((item: any) => ({
          id: item.id,
          description: item.notes || item.item_type || 'Time Entry',
          amount: item.total || 0,
          date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          category: item.item_type,
          status: item.status,
          finance_type: 'time' as const,
          case_id: item.case_id,
          user_id: item.user_id,
          notes: item.notes,
          hours: item.hours,
          hourly_rate: item.rate,
          quantity: 1,
          unit_price: item.rate,
          created_at: item.created_at,
          updated_at: item.updated_at,
          case_number: item.cases?.case_number,
          case_title: item.cases?.title,
        })));
      }

      if (!financeType || financeType === 'expense') {
        let expenseQuery = supabase
          .from('expense_entries')
          .select(`
            *,
            cases:case_id (
              case_number,
              title
            )
          `)
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });

        if (caseId) expenseQuery = expenseQuery.eq('case_id', caseId);
        if (status) expenseQuery = expenseQuery.eq('status', status as any);
        if (userId) expenseQuery = expenseQuery.eq('user_id', userId);
        if (limit && !financeType) expenseQuery = expenseQuery.limit(Math.ceil(limit / 2));
        else if (limit) expenseQuery = expenseQuery.limit(limit);

        const { data: expenseData, error: expenseError } = await expenseQuery;
        if (expenseError) throw expenseError;

        results.push(...(expenseData || []).map((item: any) => ({
          id: item.id,
          description: item.notes || item.item_type || 'Expense',
          amount: item.total || 0,
          date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          category: item.item_type,
          status: item.status,
          finance_type: 'expense' as const,
          case_id: item.case_id,
          user_id: item.user_id,
          notes: item.notes,
          hours: null,
          hourly_rate: item.rate,
          quantity: item.quantity,
          unit_price: item.rate,
          created_at: item.created_at,
          updated_at: item.updated_at,
          case_number: item.cases?.case_number,
          case_title: item.cases?.title,
        })));
      }

      // Sort combined results by date descending
      return results.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, limit);
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
 * Mutation hook for creating an expense entry.
 * NOW writes to canonical expense_entries table.
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: ExpenseInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error('Not authenticated');

      const table = input.finance_type === 'time' ? 'time_entries' : 'expense_entries';
      
      if (input.finance_type === 'time') {
        const { data, error } = await supabase
          .from('time_entries')
          .insert({
            case_id: input.case_id,
            organization_id: organization.id,
            user_id: user.id,
            hours: input.hours || 0,
            rate: input.hourly_rate || 0,
            total: (input.hours || 0) * (input.hourly_rate || 0),
            status: (input.status || 'pending') as any,
            item_type: input.category || 'time',
            notes: input.notes,
          })
          .select()
          .single();

        if (error) throw error;
        return { ...data, finance_type: 'time' } as any;
      } else {
        const { data, error } = await supabase
          .from('expense_entries')
          .insert({
            case_id: input.case_id,
            organization_id: organization.id,
            user_id: user.id,
            quantity: input.quantity || 1,
            rate: input.unit_price || input.amount || 0,
            total: input.amount || (input.quantity || 1) * (input.unit_price || 0),
            status: (input.status || 'pending') as any,
            item_type: input.category || 'expense',
            notes: input.notes,
          })
          .select()
          .single();

        if (error) throw error;
        return { ...data, finance_type: 'expense' } as any;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense_entries'] });
      queryClient.invalidateQueries({ queryKey: ['time_entries'] });
      toast.success(`${data.finance_type === 'time' ? 'Time entry' : 'Expense'} created successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to create entry: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for updating an expense/time entry.
 * NOW writes to canonical tables.
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, finance_type, ...input }: Partial<Expense> & { id: string; finance_type?: string }) => {
      const table = finance_type === 'time' ? 'time_entries' : 'expense_entries';
      
      const updateData: any = {};
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.category !== undefined) updateData.item_type = input.category;
      
      if (finance_type === 'time') {
        if (input.hours !== undefined) updateData.hours = input.hours;
        if (input.hourly_rate !== undefined) updateData.rate = input.hourly_rate;
        if (input.hours !== undefined || input.hourly_rate !== undefined) {
          updateData.total = (input.hours || 0) * (input.hourly_rate || 0);
        }
      } else {
        if (input.quantity !== undefined) updateData.quantity = input.quantity;
        if (input.unit_price !== undefined) updateData.rate = input.unit_price;
        if (input.amount !== undefined) updateData.total = input.amount;
      }

      const { data, error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense_entries'] });
      queryClient.invalidateQueries({ queryKey: ['time_entries'] });
      toast.success('Entry updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update entry: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for deleting an expense/time entry.
 * NOW deletes from canonical tables.
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, finance_type }: { id: string; finance_type?: string }) => {
      // Try both tables if finance_type not specified
      if (!finance_type) {
        // Try time_entries first
        const { error: timeError } = await supabase
          .from('time_entries')
          .delete()
          .eq('id', id);
        
        if (!timeError) return id;
        
        // Then try expense_entries
        const { error: expenseError } = await supabase
          .from('expense_entries')
          .delete()
          .eq('id', id);
        
        if (expenseError) throw expenseError;
        return id;
      }

      const table = finance_type === 'time' ? 'time_entries' : 'expense_entries';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense_entries'] });
      queryClient.invalidateQueries({ queryKey: ['time_entries'] });
      toast.success('Entry deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete entry: ${error.message}`);
    },
  });
}

export default useExpensesQuery;
