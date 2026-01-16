/**
 * Finance Utilities
 * 
 * Provides unified access to financial data from the canonical 
 * time_entries and expense_entries tables.
 * 
 * These utilities replace direct queries to the deprecated case_finances table.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Unified finance record combining time entries and expense entries
 * with a common interface matching the legacy case_finances structure.
 */
export interface UnifiedFinanceRecord {
  id: string;
  case_id: string;
  user_id: string;
  organization_id: string;
  finance_type: 'time' | 'expense';
  date: string;
  hours: number | null;
  hourly_rate: number | null;
  amount: number;
  quantity: number;
  unit_price: number | null;
  category: string;
  status: string;
  notes: string | null;
  description: string | null;
  activity_id: string | null;
  update_id: string | null;
  finance_item_id: string | null;
  invoice_rate: number | null;
  created_at: string;
  updated_at: string;
  // Joined data (optional)
  case_number?: string;
  case_title?: string;
  user_name?: string;
}

/**
 * Time entry from canonical table with joined data
 */
export interface TimeEntryWithCase {
  id: string;
  case_id: string;
  user_id: string;
  organization_id: string;
  hours: number;
  rate: number;
  total: number | null;
  status: string;
  item_type: string;
  notes: string | null;
  event_id: string | null;
  update_id: string | null;
  finance_item_id: string | null;
  invoice_rate: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  case_number?: string;
  case_title?: string;
  user_name?: string;
}

/**
 * Expense entry from canonical table with joined data
 */
export interface ExpenseEntryWithCase {
  id: string;
  case_id: string;
  user_id: string;
  organization_id: string;
  quantity: number;
  rate: number;
  total: number | null;
  status: string;
  item_type: string;
  notes: string | null;
  receipt_url: string | null;
  event_id: string | null;
  update_id: string | null;
  finance_item_id: string | null;
  invoice_rate: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  case_number?: string;
  case_title?: string;
  user_name?: string;
}

export interface FetchFinancesOptions {
  caseId?: string;
  userId?: string;
  status?: string;
  limit?: number;
  includeTime?: boolean;
  includeExpenses?: boolean;
}

export interface CombinedFinancesResult {
  timeEntries: TimeEntryWithCase[];
  expenseEntries: ExpenseEntryWithCase[];
  combined: UnifiedFinanceRecord[];
}

/**
 * Fetch combined finances from both time_entries and expense_entries tables.
 * This replaces queries to the deprecated case_finances table.
 */
export async function fetchCombinedFinances(
  organizationId: string,
  options: FetchFinancesOptions = {}
): Promise<CombinedFinancesResult> {
  const {
    caseId,
    userId,
    status,
    limit = 100,
    includeTime = true,
    includeExpenses = true,
  } = options;

  const results: CombinedFinancesResult = {
    timeEntries: [],
    expenseEntries: [],
    combined: [],
  };

  // Parallel fetch from both tables
  const promises: Promise<void>[] = [];

  if (includeTime) {
    const timePromise = (async () => {
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          cases:case_id (case_number, title),
          profiles:user_id (full_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (caseId) query = query.eq('case_id', caseId);
      if (userId) query = query.eq('user_id', userId);
      if (status) query = query.eq('status', status as any);
      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;

      results.timeEntries = (data || []).map((item: any) => ({
        ...item,
        case_number: item.cases?.case_number,
        case_title: item.cases?.title,
        user_name: item.profiles?.full_name,
      }));
    })();
    promises.push(timePromise);
  }

  if (includeExpenses) {
    const expensePromise = (async () => {
      let query = supabase
        .from('expense_entries')
        .select(`
          *,
          cases:case_id (case_number, title),
          profiles:user_id (full_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (caseId) query = query.eq('case_id', caseId);
      if (userId) query = query.eq('user_id', userId);
      if (status) query = query.eq('status', status as any);
      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;

      results.expenseEntries = (data || []).map((item: any) => ({
        ...item,
        case_number: item.cases?.case_number,
        case_title: item.cases?.title,
        user_name: item.profiles?.full_name,
      }));
    })();
    promises.push(expensePromise);
  }

  await Promise.all(promises);

  // Combine results into unified format
  results.combined = [
    ...results.timeEntries.map(toUnifiedRecord),
    ...results.expenseEntries.map(toUnifiedRecord),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return results;
}

/**
 * Convert a time entry to unified finance record format
 */
function toUnifiedRecord(entry: TimeEntryWithCase | ExpenseEntryWithCase): UnifiedFinanceRecord {
  const isTimeEntry = 'hours' in entry;
  
  return {
    id: entry.id,
    case_id: entry.case_id,
    user_id: entry.user_id,
    organization_id: entry.organization_id,
    finance_type: isTimeEntry ? 'time' : 'expense',
    date: entry.created_at.split('T')[0],
    hours: isTimeEntry ? (entry as TimeEntryWithCase).hours : null,
    hourly_rate: entry.rate,
    amount: entry.total || 0,
    quantity: isTimeEntry ? 1 : (entry as ExpenseEntryWithCase).quantity,
    unit_price: entry.rate,
    category: entry.item_type,
    status: entry.status,
    notes: entry.notes,
    description: null,
    activity_id: entry.event_id,
    update_id: entry.update_id,
    finance_item_id: entry.finance_item_id,
    invoice_rate: entry.invoice_rate,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    case_number: entry.case_number,
    case_title: entry.case_title,
    user_name: entry.user_name,
  };
}

/**
 * Aggregate financial totals from both canonical tables
 */
export async function aggregateFinanceTotals(
  organizationId: string,
  options: {
    caseId?: string;
    caseIds?: string[];
    status?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{
  totalTimeAmount: number;
  totalTimeHours: number;
  totalExpenseAmount: number;
  totalAmount: number;
}> {
  const { caseId, caseIds, status, startDate, endDate } = options;

  // Build time entries query
  let timeQuery = supabase
    .from('time_entries')
    .select('total, hours')
    .eq('organization_id', organizationId);

  if (caseId) timeQuery = timeQuery.eq('case_id', caseId);
  if (caseIds?.length) timeQuery = timeQuery.in('case_id', caseIds);
  if (status) timeQuery = timeQuery.eq('status', status as any);
  if (startDate) timeQuery = timeQuery.gte('created_at', startDate.toISOString());
  if (endDate) timeQuery = timeQuery.lte('created_at', endDate.toISOString());

  // Build expense entries query
  let expenseQuery = supabase
    .from('expense_entries')
    .select('total')
    .eq('organization_id', organizationId);

  if (caseId) expenseQuery = expenseQuery.eq('case_id', caseId);
  if (caseIds?.length) expenseQuery = expenseQuery.in('case_id', caseIds);
  if (status) expenseQuery = expenseQuery.eq('status', status as any);
  if (startDate) expenseQuery = expenseQuery.gte('created_at', startDate.toISOString());
  if (endDate) expenseQuery = expenseQuery.lte('created_at', endDate.toISOString());

  const [timeResult, expenseResult] = await Promise.all([
    timeQuery,
    expenseQuery,
  ]);

  const timeData = timeResult.data || [];
  const expenseData = expenseResult.data || [];

  const totalTimeAmount = timeData.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
  const totalTimeHours = timeData.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
  const totalExpenseAmount = expenseData.reduce((sum, e) => sum + (Number(e.total) || 0), 0);

  return {
    totalTimeAmount,
    totalTimeHours,
    totalExpenseAmount,
    totalAmount: totalTimeAmount + totalExpenseAmount,
  };
}

/**
 * Get pending totals from both canonical tables
 */
export async function getPendingTotals(
  organizationId: string
): Promise<{
  pendingTimeAmount: number;
  pendingExpenseAmount: number;
  pendingTotal: number;
}> {
  const [timeResult, expenseResult] = await Promise.all([
    supabase
      .from('time_entries')
      .select('total')
      .eq('organization_id', organizationId)
      .eq('status', 'pending'),
    supabase
      .from('expense_entries')
      .select('total')
      .eq('organization_id', organizationId)
      .eq('status', 'pending'),
  ]);

  const pendingTimeAmount = (timeResult.data || []).reduce(
    (sum, e) => sum + (Number(e.total) || 0), 0
  );
  const pendingExpenseAmount = (expenseResult.data || []).reduce(
    (sum, e) => sum + (Number(e.total) || 0), 0
  );

  return {
    pendingTimeAmount,
    pendingExpenseAmount,
    pendingTotal: pendingTimeAmount + pendingExpenseAmount,
  };
}

/**
 * Delete a finance record from the correct canonical table based on type
 */
export async function deleteFinanceRecord(
  id: string,
  financeType: 'time' | 'expense'
): Promise<{ success: boolean; error?: string }> {
  const table = financeType === 'time' ? 'time_entries' : 'expense_entries';
  
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update a finance record status in the correct canonical table
 */
export async function updateFinanceStatus(
  id: string,
  financeType: 'time' | 'expense',
  status: string
): Promise<{ success: boolean; error?: string }> {
  const table = financeType === 'time' ? 'time_entries' : 'expense_entries';
  
  const { error } = await supabase
    .from(table)
    .update({ status: status as any })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
