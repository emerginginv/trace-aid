import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { DashboardUpdate, DashboardExpense, OrgUser } from './types';

interface UseDashboardRecentOptions {
  updatesFilter: 'my' | 'all';
  expensesFilter: 'my' | 'all';
}

interface RecentData {
  updates: DashboardUpdate[];
  expenses: DashboardExpense[];
  updateTypePicklists: { value: string; color: string | null }[];
}

async function fetchRecentData(
  orgId: string,
  userId: string,
  updatesFilter: 'my' | 'all',
  expensesFilter: 'my' | 'all',
  users: OrgUser[]
): Promise<RecentData> {
  // Fetch update type picklists
  const { data: picklistData } = await supabase
    .from('picklists')
    .select('value, color')
    .eq('type', 'update_type')
    .eq('is_active', true)
    .or(`organization_id.eq.${orgId},organization_id.is.null`);

  const updateTypePicklists = picklistData || [];

  // Fetch recent updates
  let updatesQuery = supabase
    .from('case_updates')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (updatesFilter === 'my') {
    updatesQuery = updatesQuery.eq('user_id', userId);
  }

  const { data: updatesData } = await updatesQuery;
  
  const updates: DashboardUpdate[] = (updatesData || []).map((update) => {
    const author = users.find((u) => u.id === update.user_id);
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

  // Fetch recent expenses
  let expensesQuery = supabase
    .from('expense_entries')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (expensesFilter === 'my') {
    expensesQuery = expensesQuery.eq('user_id', userId);
  }

  const { data: expensesData } = await expensesQuery;
  
  const expenses: DashboardExpense[] = (expensesData || []).map((expense) => {
    const submitter = users.find((u) => u.id === expense.user_id);
    return {
      id: expense.id,
      description: expense.notes || expense.item_type || 'Expense',
      amount: typeof expense.total === 'number' ? expense.total : parseFloat(String(expense.total) || '0'),
      date: expense.created_at.split('T')[0],
      category: expense.item_type || 'General',
      userId: expense.user_id,
      submittedByName: submitter?.full_name || submitter?.email || null,
      caseId: expense.case_id,
      financeData: expense,
    };
  });

  return { updates, expenses, updateTypePicklists };
}

export function useDashboardRecent(
  { updatesFilter, expensesFilter }: UseDashboardRecentOptions,
  users: OrgUser[] = []
) {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['dashboard', 'recent', orgId, updatesFilter, expensesFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !orgId) throw new Error('Not authenticated');
      return fetchRecentData(orgId, user.id, updatesFilter, expensesFilter, users);
    },
    enabled: !!orgId && users.length > 0,
    staleTime: 30 * 1000,
  });
}
