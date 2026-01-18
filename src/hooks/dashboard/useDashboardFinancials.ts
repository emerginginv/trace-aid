import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { FinancialSummary } from './types';

const defaultFinancials: FinancialSummary = {
  totalRetainerFunds: 0,
  outstandingExpenses: 0,
  unpaidInvoices: 0,
};

async function fetchFinancialSummary(orgId: string): Promise<FinancialSummary> {
  const [retainerResult, pendingTimeResult, pendingExpenseResult, unpaidInvoicesResult] = await Promise.all([
    supabase.from('retainer_funds').select('amount').eq('organization_id', orgId),
    supabase
      .from('time_entries')
      .select('total')
      .eq('organization_id', orgId)
      .eq('status', 'pending'),
    supabase
      .from('expense_entries')
      .select('total')
      .eq('organization_id', orgId)
      .eq('status', 'pending'),
    supabase
      .from('invoices')
      .select('balance_due')
      .eq('organization_id', orgId)
      .gt('balance_due', 0),
  ]);

  const totalRetainer =
    retainerResult.data?.reduce((sum, r) => sum + parseFloat(String(r.amount) || '0'), 0) || 0;
  const pendingTimeTotal =
    pendingTimeResult.data?.reduce((sum, e) => sum + parseFloat(String(e.total) || '0'), 0) || 0;
  const pendingExpenseTotal =
    pendingExpenseResult.data?.reduce((sum, e) => sum + parseFloat(String(e.total) || '0'), 0) || 0;
  const outstandingExpenses = pendingTimeTotal + pendingExpenseTotal;
  const unpaidInvoicesTotal =
    unpaidInvoicesResult.data?.reduce((sum, i) => sum + parseFloat(String(i.balance_due) || '0'), 0) || 0;

  return {
    totalRetainerFunds: totalRetainer,
    outstandingExpenses,
    unpaidInvoices: unpaidInvoicesTotal,
  };
}

export function useDashboardFinancials() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['dashboard', 'financials', orgId],
    queryFn: () => fetchFinancialSummary(orgId!),
    enabled: !!orgId,
    staleTime: 60 * 1000, // 1 minute
    placeholderData: defaultFinancials,
  });
}
