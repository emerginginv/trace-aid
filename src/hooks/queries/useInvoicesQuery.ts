import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface Invoice {
  id: string;
  invoice_number: string;
  case_id: string;
  date: string;
  due_date?: string;
  status: string;
  total: number;
  subtotal?: number;
  total_paid?: number;
  balance_due?: number;
  retainer_applied?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface UseInvoicesQueryOptions {
  caseId?: string;
  status?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for fetching invoices with caching.
 * 
 * @example
 * const { data: invoices, isLoading } = useInvoicesQuery({ status: 'pending' });
 */
export function useInvoicesQuery(options: UseInvoicesQueryOptions = {}) {
  const { organization } = useOrganization();
  const { caseId, status, search, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['invoices', organization?.id, caseId, status, search, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .order('date', { ascending: false });

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.ilike('invoice_number', `%${search}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * React Query hook for fetching a single invoice by ID.
 */
export function useInvoiceQuery(invoiceId: string | undefined) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId || !organization?.id) return null;

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      return data as Invoice;
    },
    enabled: !!invoiceId && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Mutation hook for updating an invoice.
 */
export function useUpdateInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
      toast({
        title: 'Success',
        description: 'Invoice updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invoice',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get invoice statistics for dashboard.
 */
export function useInvoiceStats() {
  const { data: invoices = [], isLoading } = useInvoicesQuery();

  const stats = {
    total: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0),
    unpaid: invoices.filter(inv => ['pending', 'sent', 'partial', 'overdue'].includes(inv.status)).length,
    unpaidAmount: invoices
      .filter(inv => ['pending', 'sent', 'partial', 'overdue'].includes(inv.status))
      .reduce((sum, inv) => sum + Number(inv.balance_due || inv.total || 0), 0),
    overdue: invoices.filter(inv => inv.status === 'overdue').length,
    overdueAmount: invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + Number(inv.balance_due || inv.total || 0), 0),
    paid: invoices.filter(inv => inv.status === 'paid').length,
    paidAmount: invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.total || 0), 0),
  };

  return { stats, isLoading };
}

export default useInvoicesQuery;
